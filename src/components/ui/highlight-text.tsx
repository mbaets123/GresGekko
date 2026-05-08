export function HighlightText({ text }: { text: string }) {
  const regex = /\*\*(.*?)\*\*/g;
  const parts: { text: string; bold: boolean }[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), bold: false });
    }
    parts.push({ text: match[1], bold: true });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), bold: false });
  }

  return (
    <span>
      {parts.map((part, i) =>
        part.bold ? (
          <span key={i} className="font-bold text-gres-yellow">{part.text}</span>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </span>
  );
}
