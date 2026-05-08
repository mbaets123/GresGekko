import { supabase } from "./supabase";
import type { Question } from "@/types";

export async function getQuestions(paragraphId: string): Promise<Question[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("paragraph_id", paragraphId)
    .order("difficulty")
    .order("id");

  if (error) throw error;

  return (data || []).map((q) => ({
    id: String(q.id),
    paragraphId: q.paragraph_id,
    type: q.type as Question["type"],
    difficulty: q.difficulty as Question["difficulty"],
    question: q.question,
    options: q.options || undefined,
    answer: q.answer,
    explanation: q.explanation,
  }));
}
