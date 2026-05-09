import { unstable_cache } from "next/cache";
import { supabase } from "./supabase";
import type { Chapter, Paragraph, Concept } from "@/types";

/* ---------- helpers ---------- */

function mapParagraph(
  p: Record<string, unknown>,
  goals: Record<string, unknown>[],
  concepts: Record<string, unknown>[]
): Paragraph {
  return {
    id: p.id as string,
    chapterId: p.chapter_id as string,
    title: p.title as string,
    order: p.order as number,
    videoUrl: (p.video_url as string) || "",
    transcript: (p.transcript as string) || "",
    infographicUrl: (p.infographic_url as string) || "",
    isExtra: (p.is_extra as boolean) || false,
    learningGoals: goals
      .filter((g) => g.paragraph_id === p.id)
      .map((g) => g.text as string),
    concepts: concepts
      .filter((c) => c.paragraph_id === p.id)
      .map((c): Concept => ({ term: c.term as string, definition: c.definition as string })),
  };
}

/* ---------- Homepage: alle hoofdstukken ---------- */

export const getChapters = unstable_cache(async function _getChapters(): Promise<Chapter[]> {
  const [chaptersRes, paragraphsRes, goalsRes, conceptsRes] = await Promise.all([
    supabase.from("chapters").select("*").order("order"),
    supabase.from("paragraphs").select("id, chapter_id, title, \"order\", is_extra").order("order"),
    supabase.from("learning_goals").select("paragraph_id, text").order("order"),
    supabase.from("concepts").select("paragraph_id, term, definition").order("order"),
  ]);

  if (chaptersRes.error) throw chaptersRes.error;
  if (paragraphsRes.error) throw paragraphsRes.error;

  return (chaptersRes.data || []).map((ch) => ({
    id: ch.id,
    title: ch.title,
    description: ch.description,
    order: ch.order,
    icon: ch.icon,
    paragraphs: (paragraphsRes.data || [])
      .filter((p) => p.chapter_id === ch.id)
      .map((p) => mapParagraph(p, goalsRes.data || [], conceptsRes.data || [])),
  }));
}, ["chapters-all"], { revalidate: 3600 });

/* ---------- Homepage (licht): alleen chapters + paragraph count ---------- */

export async function getChaptersLight(): Promise<Chapter[]> {
  const [chaptersRes, paragraphsRes] = await Promise.all([
    supabase.from("chapters").select("*").order("order"),
    supabase.from("paragraphs").select("id, chapter_id, title, \"order\", is_extra").order("order"),
  ]);

  if (chaptersRes.error) throw chaptersRes.error;
  if (paragraphsRes.error) throw paragraphsRes.error;

  return (chaptersRes.data || []).map((ch) => ({
    id: ch.id,
    title: ch.title,
    description: ch.description,
    order: ch.order,
    icon: ch.icon,
    paragraphs: (paragraphsRes.data || [])
      .filter((p) => p.chapter_id === ch.id)
      .map((p): Paragraph => ({
        id: p.id as string,
        chapterId: p.chapter_id as string,
        title: p.title as string,
        order: p.order as number,
        videoUrl: "",
        transcript: "",
        infographicUrl: "",
        isExtra: (p.is_extra as boolean) || false,
        learningGoals: [],
        concepts: [],
      })),
  }));
}

/* ---------- Hoofdstuk-pagina: één hoofdstuk ---------- */

export const getChapter = unstable_cache(async function _getChapter(chapterId: string): Promise<Chapter | null> {
  const { data: ch, error } = await supabase
    .from("chapters")
    .select("*")
    .eq("id", chapterId)
    .single();

  if (error || !ch) return null;

  const [paragraphsRes, goalsRes, conceptsRes] = await Promise.all([
    supabase.from("paragraphs").select("id, chapter_id, title, \"order\", is_extra, video_url, infographic_url").eq("chapter_id", chapterId).order("order"),
    supabase.from("learning_goals").select("paragraph_id, text, \"order\"").like("paragraph_id", `${chapterId}-%`).order("order"),
    supabase.from("concepts").select("paragraph_id, term, definition, \"order\"").like("paragraph_id", `${chapterId}-%`).order("order"),
  ]);

  return {
    id: ch.id,
    title: ch.title,
    description: ch.description,
    order: ch.order,
    icon: ch.icon,
    paragraphs: (paragraphsRes.data || []).map((p) =>
      mapParagraph(p, goalsRes.data || [], conceptsRes.data || [])
    ),
  };
}, ["chapter"], { revalidate: 3600 });

/* ---------- Paragraaf-pagina: één paragraaf + chapter context ---------- */

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
