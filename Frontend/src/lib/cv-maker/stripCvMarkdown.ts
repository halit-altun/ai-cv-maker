/**
 * CV gövdesindeki markdown vurgu işaretlerini ( **kalın** ) düz metne çevirir.
 */
export function stripCvMarkdownEmphasis(text: string): string {
  let s = String(text || '');
  s = s.replace(/\*\*([\s\S]*?)\*\*/g, (_, inner: string) =>
    String(inner || '')
      .replace(/\s+/g, ' ')
      .trim()
  );
  s = s.replace(/__([\s\S]*?)__/g, (_, inner: string) =>
    String(inner || '')
      .replace(/\s+/g, ' ')
      .trim()
  );
  s = s.replace(/`([^`]+)`/g, '$1');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  s = s.replace(/\*\*/g, '');
  s = s.replace(/__/g, '');
  s = s.replace(/`/g, '');
  s = s.replace(/[ \t]{2,}/g, ' ');
  return s;
}
