import { db } from '@/db';
import { researchSessions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function saveResearchSession(data: {
  userId: string;
  prompt: string;
  depth: number;
  breadth: number;
  status: string;
  report?: string;
  pdfUrl?: string;
  researchData?: any;
  clarifyingQuestions?: any;
}) {
  const [session] = await db
    .insert(researchSessions)
    .values({
      userId: data.userId,
      prompt: data.prompt,
      depth: data.depth.toString(),
      breadth: data.breadth.toString(),
      status: data.status,
      report: data.report,
      pdfUrl: data.pdfUrl,
      researchData: data.researchData,
      clarifyingQuestions: data.clarifyingQuestions,
    })
    .returning();

  return session;
}

export async function updateResearchSession(
  id: number,
  data: Partial<{
    status: string;
    report: string;
    pdfUrl: string;
    researchData: any;
  }>
) {
  const [session] = await db
    .update(researchSessions)
    .set(data)
    .where(eq(researchSessions.id, id))
    .returning();

  return session;
}

export async function getUserResearchSessions(userId: string) {
  const sessions = await db
    .select()
    .from(researchSessions)
    .where(eq(researchSessions.userId, userId))
    .orderBy(desc(researchSessions.createdAt));

  return sessions;
}

export async function deleteResearchSession(id: number) {
  const [session] = await db
    .delete(researchSessions)
    .where(eq(researchSessions.id, id))
    .returning();

  return session;
}
