import { createClient } from "@supabase/supabase-js";
import { YoutubeTranscript } from "youtube-transcript";

const supabase = createClient(
  "https://nnpzxphodimipscrvvbg.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ucHp4cGhvZGltaXBzY3J2dmJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNTk4MjEsImV4cCI6MjA5MzgzNTgyMX0.aPEakiEWKuPFgjcKvo6fe_iPGVH71I-Z6vSbs71K5Qw"
);

async function fetchTranscripts() {
  const { data: paragraphs, error } = await supabase
    .from("paragraphs")
    .select("id, title, video_url")
    .neq("video_url", "")
    .order("id");

  if (error) {
    console.error("Database error:", error);
    return;
  }

  console.log(`Found ${paragraphs.length} paragraphs with videos\n`);

  for (const p of paragraphs) {
    const videoId = p.video_url.split("v=")[1]?.split("&")[0];
    if (!videoId) {
      console.log(`⚠️  ${p.id} ${p.title} — no valid video ID`);
      continue;
    }

    try {
      const items = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: "nl",
      });
      const transcript = items.map((item) => item.text).join(" ");

      const { error: updateError } = await supabase
        .from("paragraphs")
        .update({ transcript })
        .eq("id", p.id);

      if (updateError) {
        console.log(`❌ ${p.id} ${p.title} — save error: ${updateError.message}`);
      } else {
        console.log(`✅ ${p.id} ${p.title} — ${transcript.length} chars`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`❌ ${p.id} ${p.title} — ${msg}`);
    }
  }

  console.log("\nDone!");
}

fetchTranscripts();
