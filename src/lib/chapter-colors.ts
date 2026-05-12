/**
 * Shared chapter color palette — used on homepage cards and chapter detail pages.
 * Index by (chapter.order - 1) % length.
 */
export const chapterColors = [
  { bg: "from-blue-500/10 to-cyan-500/10", border: "hover:border-blue-400/40", icon: "bg-blue-500/15", overlay: "bg-blue-800/60", overlayHover: "group-hover:bg-blue-800/50", banner: "bg-blue-800/75" },
  { bg: "from-orange-500/10 to-red-500/10", border: "hover:border-orange-400/40", icon: "bg-orange-500/15", overlay: "bg-orange-800/60", overlayHover: "group-hover:bg-orange-800/50", banner: "bg-orange-800/75" },
  { bg: "from-green-500/10 to-emerald-500/10", border: "hover:border-green-400/40", icon: "bg-green-500/15", overlay: "bg-green-800/60", overlayHover: "group-hover:bg-green-800/50", banner: "bg-green-800/75" },
  { bg: "from-red-500/10 to-pink-500/10", border: "hover:border-red-400/40", icon: "bg-red-500/15", overlay: "bg-red-800/60", overlayHover: "group-hover:bg-red-800/50", banner: "bg-red-800/75" },
  { bg: "from-purple-500/10 to-violet-500/10", border: "hover:border-purple-400/40", icon: "bg-purple-500/15", overlay: "bg-purple-800/60", overlayHover: "group-hover:bg-purple-800/50", banner: "bg-purple-800/75" },
  { bg: "from-indigo-500/10 to-blue-500/10", border: "hover:border-indigo-400/40", icon: "bg-indigo-500/15", overlay: "bg-indigo-800/60", overlayHover: "group-hover:bg-indigo-800/50", banner: "bg-indigo-800/75" },
] as const;

export function getChapterColors(order: number) {
  return chapterColors[(order - 1) % chapterColors.length];
}
