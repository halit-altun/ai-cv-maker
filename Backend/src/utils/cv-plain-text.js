/**
 * CV gövdesindeki markdown vurgu işaretlerini ( **kalın** ) düz metne çevirir.
 * Önizleme/PDF’de yıldızlar görünmesin.
 */
function stripCvMarkdownEmphasis(text) {
  let s = String(text || "");
  s = s.replace(/\*\*([\s\S]*?)\*\*/g, (_, inner) =>
    String(inner || "")
      .replace(/\s+/g, " ")
      .trim()
  );
  s = s.replace(/__([\s\S]*?)__/g, (_, inner) =>
    String(inner || "")
      .replace(/\s+/g, " ")
      .trim()
  );
  s = s.replace(/`([^`]+)`/g, "$1");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
  s = s.replace(/\*\*/g, "");
  s = s.replace(/__/g, "");
  s = s.replace(/`/g, "");
  s = s.replace(/[ \t]{2,}/g, " ");
  return s;
}

module.exports = {
  stripCvMarkdownEmphasis,
};
