import { supabaseServer } from "./supabase-server";
import type { Question } from "@/types";

function mapRow(q: Record<string, unknown>): Question {
  return {
    id: String(q.id),
    paragraphId: q.paragraph_id as string,
    type: q.type as Question["type"],
    difficulty: q.difficulty as Question["difficulty"],
    question: q.question as string,
    options: (q.options as string[] | null) || undefined,
    answer: q.answer as string,
    explanation: (q.explanation as string | null) ?? "",
  };
}

export async function getQuestions(paragraphId: string): Promise<Question[]> {
  const { data, error } = await supabaseServer
    .from("questions")
    .select("*")
    .eq("paragraph_id", paragraphId)
    .order("difficulty")
    .order("id");

  if (error) throw error;
  return (data || []).map(mapRow);
}

export async function getChapterQuestions(paragraphIds: string[]): Promise<Question[]> {
  if (paragraphIds.length === 0) return [];
  const { data, error } = await supabaseServer
    .from("questions")
    .select("*")
    .in("paragraph_id", paragraphIds)
    .order("difficulty")
    .order("id");

  if (error) throw error;
  return (data || []).map(mapRow);
}
