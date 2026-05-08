import { supabase } from "./supabase";
import type { Chapter, Paragraph, Concept } from "@/types";

export async function getChapters(): Promise<Chapter[]> {
  const { data: chaptersData, error: chaptersError } = await supabase
    .from("chapters")
    .select("*")
    .order("order");

  if (chaptersError) throw chaptersError;

  const { data: paragraphsData, error: paragraphsError } = await supabase
    .from("paragraphs")
    .select("*")
    .order("order");

  if (paragraphsError) throw paragraphsError;

  const { data: goalsData } = await supabase
    .from("learning_goals")
    .select("*")
    .order("order");

  const { data: conceptsData } = await supabase
    .from("concepts")
    .select("*")
    .order("order");

  return chaptersData.map((ch) => ({
    id: ch.id,
    title: ch.title,
    description: ch.description,
    order: ch.order,
    icon: ch.icon,
    paragraphs: paragraphsData
      .filter((p) => p.chapter_id === ch.id)
      .map((p) => ({
        id: p.id,
        chapterId: p.chapter_id,
        title: p.title,
        order: p.order,
        videoUrl: p.video_url || "",
        transcript: p.transcript || "",
        infographicUrl: p.infographic_url || "",
        isExtra: p.is_extra || false,
        learningGoals: (goalsData || [])
          .filter((g) => g.paragraph_id === p.id)
          .map((g) => g.text),
        concepts: (conceptsData || [])
          .filter((c) => c.paragraph_id === p.id)
          .map((c): Concept => ({ term: c.term, definition: c.definition })),
      })),
  }));
}

export async function getChapter(chapterId: string): Promise<Chapter | null> {
  const chapters = await getChapters();
  return chapters.find((c) => c.id === chapterId) || null;
}

export async function getParagraph(
  chapterId: string,
  paragraphId: string
): Promise<{ chapter: Chapter; paragraph: Paragraph } | null> {
  const chapter = await getChapter(chapterId);
  if (!chapter) return null;

  const paragraph = chapter.paragraphs.find((p) => p.id === paragraphId);
  if (!paragraph) return null;

  return { chapter, paragraph };
}
