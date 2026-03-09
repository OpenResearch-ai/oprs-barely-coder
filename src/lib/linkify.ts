/**
 * Convert URLs in plain text to clickable links
 */
export function linkify(text: string): { type: "text" | "link"; content: string; href?: string }[] {
  const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
  const parts: { type: "text" | "link"; content: string; href?: string }[] = [];
  let lastIndex = 0;
  let match;

  while ((match = URL_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    const url = match[0];
    parts.push({ type: "link", content: url, href: url });
    lastIndex = match.index + url.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: "text", content: text }];
}
