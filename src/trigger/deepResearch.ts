import { openrouter } from "@openrouter/ai-sdk-provider";
import { metadata, schemaTask } from "@trigger.dev/sdk";
import { generatePdfAndUpload } from "./generatePdfAndUpload";
import { generateObject } from "ai";
import { generateReport } from "./generateReport";
import { Exa } from "exa-js";
import { z } from "zod";
import { saveResearchSession } from "@/lib/research-sessions";
import { canStartResearch, incrementSessionUsage } from "@/lib/subscriptions";

// You can change this to any other model available on the AI SDK
// Type assertion to resolve OpenRouter/AI SDK version compatibility
export const mainModel = openrouter("google/gemini-3.1-flash-lite") as any;

type Learning = {
  learning: string;
  followUpQuestions: string[];
};

type Research = {
  query: string | undefined;
  queries: string[];
  searchResults: SearchResult[];
  learnings: Learning[];
  completedQueries: string[];
};

// Per-run research context to eliminate global mutable state
interface ResearchContext {
  query: string;
  queries: string[];
  searchResults: SearchResult[];
  learnings: Learning[];
  completedQueries: Set<string>;
}

function createResearchContext(initialQuery: string): ResearchContext {
  return {
    query: initialQuery,
    queries: [],
    searchResults: [],
    learnings: [],
    completedQueries: new Set(),
  };
}

// Semantic query deduplication to prevent redundant searches
function isQueryDuplicate(
  newQuery: string,
  existingQueries: string[]
): boolean {
  const normalized = newQuery.toLowerCase().trim();
  return existingQueries.some(q => {
    const existing = q.toLowerCase().trim();
    // Exact match or high overlap (20+ chars)
    return existing === normalized ||
           (normalized.length > 20 && existing.includes(normalized.substring(0, 20)));
  });
}

// Dynamic knowledge gap analysis for stopping criteria
async function shouldContinueResearch(
  query: string,
  learnings: Learning[],
  depth: number
): Promise<{ shouldContinue: boolean; reason: string }> {
  if (depth <= 0) {
    return { shouldContinue: false, reason: "Max depth reached" };
  }

  try {
    const { object } = await generateObject({
      model: mainModel,
      prompt: `Based on these learnings about "${query}", do we have sufficient information?
      Or are there critical gaps requiring more research?

Learnings:
${learnings.map((l, i) => `${i + 1}. ${l.learning}`).join("\n")}`,
      schema: z.object({
        isSufficient: z.boolean().describe("Whether current information is sufficient"),
        knowledgeGaps: z.array(z.string()).describe("Critical gaps if not sufficient"),
        confidence: z.number().min(0).max(1).describe("Confidence in assessment (0-1)"),
      }),
    });

    return {
      shouldContinue: !object.isSufficient && object.confidence < 0.8,
      reason: object.knowledgeGaps.join(", "),
    };
  } catch (error) {
    console.error("Error in shouldContinueResearch:", error);
    // Default to continue if evaluation fails
    return { shouldContinue: true, reason: "Evaluation failed, continuing research" };
  }
}

// Granular progress tracking calculation
function calculateProgress(
  currentDepth: number,
  totalDepth: number,
  completedQueries: number,
  totalQueries: number
): number {
  const depthProgress = (totalDepth - currentDepth) / totalDepth;
  const queryProgress = totalQueries > 0 ? completedQueries / totalQueries : 0;
  return Math.min(10 + (depthProgress * 0.4 + queryProgress * 0.4) * 80, 90);
}

export const deepResearchOrchestrator = schemaTask({
  id: "deep-research",
  schema: z.object({
    prompt: z.string().min(1),
    // How many levels of queries to generate
    depth: z.number().min(1).max(5).optional().default(2),
    // How many queries to generate for each depth level
    breadth: z.number().min(1).max(10).optional().default(2),
    userId: z.string().optional(), // Clerk user ID
  }),
  run: async (payload) => {
    // Check if user can start research
    if (payload.userId) {
      const check = await canStartResearch(payload.userId);

      if (!check.allowed) {
        throw new Error(check.reason || 'Unable to start research. Please upgrade your plan.');
      }

      // Validate depth/breadth against plan limits if user has a subscription
      const requestedDepth = payload.depth ?? 2;
      const requestedBreadth = payload.breadth ?? 2;

      if (check.subscription) {
        if (requestedDepth > check.subscription.maxDepth) {
          throw new Error(`Requested depth (${requestedDepth}) exceeds your plan limit (${check.subscription.maxDepth}). Please upgrade to access deeper research.`);
        }

        if (requestedBreadth > check.subscription.maxBreadth) {
          throw new Error(`Requested breadth (${requestedBreadth}) exceeds your plan limit (${check.subscription.maxBreadth}). Please upgrade to access broader research.`);
        }
      } else {
        // Free tier limits (depth 1, breadth 2)
        if (requestedDepth > 1) {
          throw new Error(`Requested depth (${requestedDepth}) exceeds free tier limit (1). Please upgrade to access deeper research.`);
        }

        if (requestedBreadth > 2) {
          throw new Error(`Requested breadth (${requestedBreadth}) exceeds free tier limit (2). Please upgrade to access broader research.`);
        }
      }

      // Increment session usage
      await incrementSessionUsage(payload.userId);
    }

    metadata.set("status", {
      progress: 0,
      label: `Researching ${payload.prompt}. Depth: ${
        payload.depth ?? 2
      }. Breadth: ${payload.breadth ?? 3}`,
    });

    // Initialize fresh research context for this run (eliminates global state race condition)
    const context = createResearchContext(payload.prompt);

    const research = await deepResearch(
      context,
      payload.depth,
      payload.breadth,
      payload.depth, // Pass totalDepth for progress calculation
    );

    metadata.set("status", {
      progress: 50,
      label: "Research complete. Generating report...",
    });

    const report = await generateReport.triggerAndWait({
      research: research,
    });

    metadata.set("status", {
      progress: 60,
      label: "Creating PDF and uploading to R2 storage...",
    });

    if (!report.ok) {
      throw new Error("No report generated");
    }

    const reportName = `research-report-${Date.now()}`;

    const pdf = await generatePdfAndUpload.triggerAndWait({
      report: report.output.report,
      name: reportName,
    });

    if (!pdf.ok) {
      throw new Error("No PDF generated");
    }

    metadata.set("status", {
      progress: 100,
      label: "Deep research complete!",
    });

    // Set the PDF name in metadata so the frontend can access it
    metadata.set("pdfName", pdf.output.key);

    // Save research session to database if userId is provided
    if (payload.userId) {
      try {
        await saveResearchSession({
          userId: payload.userId,
          prompt: payload.prompt,
          depth: payload.depth ?? 2,
          breadth: payload.breadth ?? 2,
          status: "completed",
          report: report.output.report,
          pdfUrl: pdf.output.pdfLocation,
          researchData: research,
        });
      } catch (error) {
        console.error("Failed to save research session:", error);
        // Don't fail the task if database save fails
      }
    }

    return {
      report: report.output.report,
      pdf: pdf.output.pdfLocation,
    };
  },
});

export const deepResearch = async (
  context: ResearchContext,
  depth: number,
  breadth: number,
  totalDepth: number, // Added for progress calculation
  currentProgress: number = 10, // Starting progress
) => {
  // Calculate granular progress
  const progress = calculateProgress(
    depth,
    totalDepth,
    context.completedQueries.size,
    context.queries.length
  );

  // Dynamic stopping: check if we have sufficient information before continuing
  if (context.learnings.length > 0) {
    const { shouldContinue, reason } = await shouldContinueResearch(
      context.query,
      context.learnings,
      depth
    );

    if (!shouldContinue) {
      metadata.set("status", {
        progress: Math.min(progress + 10, 50),
        label: `Research complete. Reason: ${reason}`,
      });
      return {
        query: context.query,
        queries: context.queries,
        searchResults: context.searchResults,
        learnings: context.learnings,
        completedQueries: Array.from(context.completedQueries),
      };
    }
  }

  if (depth === 0) {
    return {
      query: context.query,
      queries: context.queries,
      searchResults: context.searchResults,
      learnings: context.learnings,
      completedQueries: Array.from(context.completedQueries),
    };
  }

  metadata.set("status", {
    progress: progress,
    label: `Depth ${depth}: Generating ${breadth} search queries...`,
  });

  const queries = await generateSearchQueries(context.query, breadth, context.completedQueries);

  const uniqueQueries = queries.filter(q => !isQueryDuplicate(q, context.queries));
  context.queries.push(...uniqueQueries);

  if (uniqueQueries.length === 0) {
    metadata.set("status", {
      progress: progress,
      label: `Depth ${depth}: All queries already explored. Moving deeper...`,
    });
  }

  metadata.set("status", {
    progress: progress + 5,
    label: `Depth ${depth}: Executing ${uniqueQueries.length} searches in parallel...`,
  });

  const searchTasks = uniqueQueries.map(async (query, index) => {
    const queryLabel = `"${query.substring(0, 60)}${query.length > 60 ? '...' : ''}"`;
    metadata.set("status", {
      progress: progress + 5 + Math.round((index / uniqueQueries.length) * 15),
      label: `Searching: ${queryLabel}`,
    });

    try {
      const rawResults = await searchWeb(query);
      context.completedQueries.add(query);
      if (rawResults.length === 0) return [];

      const existingUrls = new Set(context.searchResults.map(r => r.url));
      const newResults = rawResults.filter(r => !existingUrls.has(r.url));

      const evaluatedResults = await Promise.allSettled(
        newResults.map(r => evaluateSourceQuality(query, r))
      );

      const topSources: SearchResult[] = [];
      for (const result of evaluatedResults) {
        if (result.status === "fulfilled" && (result.value.qualityScore ?? 5) >= 6) {
          topSources.push(result.value);
        }
      }

      return topSources.sort((a, b) => (b.qualityScore ?? 5) - (a.qualityScore ?? 5)).slice(0, 3);
    } catch (error) {
      console.error(`Search failed for "${query}":`, error);
      return [];
    }
  });

  const searchResultsArrays = await Promise.allSettled(searchTasks);
  const allResults: SearchResult[] = [];
  for (const result of searchResultsArrays) {
    if (result.status === "fulfilled") allResults.push(...result.value);
  }

  context.searchResults.push(...allResults);

  metadata.set("status", {
    progress: progress + 25,
    label: `Depth ${depth}: Processing ${allResults.length} sources for learnings...`,
  });

  for (const searchResult of allResults) {
    try {
      metadata.set("status", {
        progress: progress + 25 + Math.round((context.learnings.length / Math.max(allResults.length, 1)) * 10),
        label: `Processing: ${searchResult.title?.substring(0, 50) || searchResult.url}...`,
      });

      const learnings = await generateLearnings(context.query, searchResult);
      context.learnings.push(learnings);
    } catch (error) {
      console.error(`Learning generation failed for ${searchResult.url}:`, error);
      continue;
    }
  }

  const newQuery = `Overall research goal: ${context.query}
Previous search queries: ${Array.from(context.completedQueries).slice(-5).join(", ")}
Key findings: ${context.learnings.slice(-3).map(l => l.learning).join("; ")}`;

  try {
    const recursiveResult = await deepResearch(
      { ...context, query: newQuery },
      depth - 1,
      Math.ceil(breadth / 2),
      totalDepth,
      currentProgress,
    );

    // Merge deeper results back into current context
    context.queries.push(...recursiveResult.queries);
    context.searchResults.push(...recursiveResult.searchResults);
    context.learnings.push(...recursiveResult.learnings);
    for (const q of recursiveResult.completedQueries) {
      context.completedQueries.add(q);
    }
  } catch (error) {
    console.error(`Deep research recursion failed:`, error);
  }

  return {
    query: context.query,
    queries: context.queries,
    searchResults: context.searchResults,
    learnings: context.learnings,
    completedQueries: Array.from(context.completedQueries),
  };
};

const generateSearchQueries = async (
  query: string,
  n: number = 3,
  completedQueries?: Set<string>
) => {
  try {
    const pastQueries = completedQueries && completedQueries.size > 0
      ? `Previously searched queries (AVOID generating similar ones): ${Array.from(completedQueries).slice(-10).join(", ")}`
      : "";

    const { object: { queries } } = await generateObject({
      model: mainModel,
      prompt: `Generate ${n} diverse, specific search queries for the research topic: "${query}".

Requirements:
- Each query should explore a different angle or subtopic
- Make queries specific enough to return high-quality academic or expert sources
- Avoid overly broad or generic queries
${pastQueries}`,
      schema: z.object({
        queries: z.array(z.string().min(5).max(200)).min(1).max(n),
      }),
    });
    return queries;
  } catch (error) {
    console.error(`Error generating search queries for "${query}":`, error);
    return [query];
  }
};

const exa = new Exa(process.env.EXA_API_KEY);

type SearchResult = {
  title: string;
  url: string;
  content: string;
  qualityScore?: number; // Added for source quality scoring
  credibility?: number;
  relevance?: number;
  freshness?: number;
  depth?: number;
};

const searchWeb = async (query: string): Promise<SearchResult[]> => {
  try {
    if (!process.env.EXA_API_KEY) {
      console.error("EXA_API_KEY is not configured");
      return [];
    }

    const { results } = await exa.searchAndContents(query, {
      numResults: 3,
      livecrawl: "always",
      type: "auto",
    });

    if (!results || results.length === 0) {
      return [];
    }

    // Deduplicate by URL to avoid redundant results
    const uniqueResults = Array.from(
      new Map(results.map(r => [r.url, r])).values()
    );

    return uniqueResults.map(
      (r) =>
        ({
          title: r.title || "Untitled",
          url: r.url,
          content: r.text || "",
        }) as SearchResult,
    );
  } catch (error) {
    console.error(`Exa search failed for "${query}":`, error);
    return [];
  }
};

// Evaluate source quality using AI SDK generateObject
const sourceEvaluationSchema = z.object({
  credibility: z.number().min(1).max(10).describe("Domain authority and source trustworthiness"),
  relevance: z.number().min(1).max(10).describe("How well the source answers the query"),
  freshness: z.number().min(1).max(10).describe("Recency of information"),
  depth: z.number().min(1).max(10).describe("Content depth and comprehensiveness"),
  overallScore: z.number().min(1).max(10).describe("Overall quality score (1-10)"),
});

const evaluateSourceQuality = async (query: string, searchResult: SearchResult): Promise<SearchResult> => {
  try {
    const { object } = await generateObject({
      model: mainModel,
      prompt: `Evaluate the quality of this search result for the query "${query}".
      
Search Result:
Title: ${searchResult.title}
URL: ${searchResult.url}
Content: ${searchResult.content.substring(0, 1000)}...

Rate each dimension from 1-10 (10 being best).`,
      schema: sourceEvaluationSchema,
    });

    return {
      ...searchResult,
      credibility: object.credibility,
      relevance: object.relevance,
      freshness: object.freshness,
      depth: object.depth,
      qualityScore: object.overallScore,
    };
  } catch (error) {
    console.error(`Error evaluating source quality for ${searchResult.url}:`, error);
    // Return result with default score if evaluation fails
    return {
      ...searchResult,
      qualityScore: 5, // Default neutral score
    };
  }
};

const generateLearnings = async (query: string, searchResult: SearchResult) => {
  try {
    const { object } = await generateObject({
      model: mainModel,
      prompt:
        `The user is researching "${query}". The following search result were deemed relevant.
      Generate a learning and a follow-up question from the following search result:
   
      <search_result>
      ${JSON.stringify(searchResult)}
      </search_result>
      `,
      schema: z.object({
        learning: z.string(),
        followUpQuestions: z.array(z.string()),
      }),
    });
    return object;
  } catch (error) {
    console.error(`Error generating learnings for query "${query}":`, error);
    // Return a basic fallback learning
    return {
      learning:
        `Found relevant information about "${query}" from ${searchResult.url}`,
      followUpQuestions: [`What are the key implications of ${query}?`],
    };
  }
};
