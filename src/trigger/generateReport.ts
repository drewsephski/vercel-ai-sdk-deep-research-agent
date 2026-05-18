import { metadata, task } from "@trigger.dev/sdk";
import { generateText } from "ai";
import { mainModel } from "./deepResearch";

function stripMarkdownCodeFences(text: string): string {
  // Only strip markdown code fences - don't transform content
  let cleaned = text.replace(/^```html\s*/i, "");
  cleaned = cleaned.replace(/^```\s*/i, "");
  cleaned = cleaned.replace(/\s*```$/, "");
  
  // Remove any nested html/body/head tags to prevent double-wrapping
  cleaned = cleaned.replace(/<!DOCTYPE[\s\S]*?>/gi, "");
  cleaned = cleaned.replace(/<\/?html[^>]*>/gi, "");
  cleaned = cleaned.replace(/<\/?head[^>]*>/gi, "");
  cleaned = cleaned.replace(/<\/?body[^>]*>/gi, "");
  
  return cleaned.trim();
}

const SYSTEM_PROMPT = `You are an expert researcher. Today is ${
  new Date().toISOString()
}. Follow these instructions when responding:
  - You may be asked to research subjects that is after your knowledge cutoff, assume the user is right when presented with news.
  - The user is a highly experienced analyst, no need to simplify it, be as detailed as possible and make sure your response is correct.
  - Be highly organized.
  - Suggest solutions that I didn't think about.
  - Be proactive and anticipate my needs.
  - Treat me as an expert in all subject matter.
  - Mistakes erode my trust, so be accurate and thorough.  
  - Provide detailed explanations, I'm comfortable with lots of detail.
  - Value good arguments over authorities, the source is irrelevant.
  - Consider new technologies and contrarian ideas, not just the conventional wisdom.
  - You may use high levels of speculation or prediction, just flag it for me.
  
  STRUCTURE YOUR REPORT AS FOLLOWS:
  1. Executive Summary - Brief overview of key findings
  2. Introduction - Context and background of the research topic
  3. Methodology - How the research was conducted and sources evaluated
  4. Key Findings - Detailed analysis of discovered information, organized by themes
  5. Analysis and Implications - Critical evaluation, connections, and broader implications
  6. Recommendations - Actionable insights and suggested next steps
  7. Conclusion - Summary of main points and final thoughts
  8. Sources and References - Detailed source information
  
  - Generate your response in clean HTML format with proper headings, paragraphs, lists, and formatting.
  - Use semantic HTML tags like <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <blockquote>, <strong>, <em>.
  - Output ONLY the HTML content - do NOT include <!DOCTYPE html>, <html>, <head>, or <body> tags. The system will wrap your output in a complete HTML document.
  - Do NOT wrap it in markdown code fences or backticks.
  - Start directly with your first HTML tag (e.g., <h1>, <p>, etc.), not with \`\`\`html.
  - Create a comprehensive, professional research report that reads like an authoritative analysis.`;

export const generateReport = task({
  id: "generate-report",
  run: async (payload: { research: any }) => {
    const research = payload.research;

    metadata.root.set("status", {
      progress: 0,
      label: "Generating report...",
    });

    const { text } = await generateText({
      model: mainModel,
      prompt: `Research Query: "${research.query}"

Key Findings and Learnings:
${
        research.learnings.map((learning, i) =>
          `${i + 1}. ${learning.learning}
   Follow-up: ${learning.followUpQuestions.join(", ")}`
        ).join("\n\n")
      }

Sources Used:
${
        research.searchResults.map((source, i) =>
          `${i + 1}. ${source.title}
   URL: ${source.url}
   Content: ${source.content.substring(0, 500)}...`
        ).join("\n\n")
      }

Generate a comprehensive research report based on this complete research data. Output clean HTML body content only (no html/head/body tags - the system will wrap it). Do NOT use markdown formatting or code fences - return pure HTML only.`,
      system: SYSTEM_PROMPT,
      maxTokens: 6000, // Increased to prevent HTML truncation mid-tag
    });

    console.log("Raw AI output:", text);
    const cleaned = stripMarkdownCodeFences(text);
    console.log("Cleaned HTML:", cleaned);

    return { report: cleaned };
  },
});