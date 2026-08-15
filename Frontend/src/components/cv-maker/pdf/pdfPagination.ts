/**
 * react-pdf sayfa kırılımı — deterministik kurallar.
 *
 * @react-pdf/layout `splitNodes` içindeki karar fonksiyonu (kaynaktan):
 *
 *   shouldBreak =
 *        props.break
 *     || (shouldSplit && wrap === false)
 *     || (!shouldSplit && endOfPresence > availableHeight && sayfada önceki içerik varsa)
 *
 *   shouldSplit     = availableHeight < box.top + box.height
 *   endOfPresence   = min(box.top + box.height + box.marginBottom + minPresenceAhead,
 *                         sonraki kardeşlerin en alt ucu)
 *
 * Bundan çıkan iki "yanlış kırılma" kaynağı vardır — ikisi de bloğun kendisi
 * sayfaya SIĞDIĞI halde bloğu sonraki sayfaya atar:
 *
 *   1) minPresenceAhead > 0  → blok + n pt yer istenir. Bir bölüm başlığında
 *      kullanıldığında başlık taşınır; react-pdf "tüm çocukları taşınan
 *      parent'ı gösterme" kuralıyla bölümün TAMAMI sonraki sayfaya geçer.
 *   2) marginBottom > 0      → blok, kendi yüksekliği + alt boşluğu kadar yer
 *      ister. Alt boşluk sayfa sonunda gereksizdir.
 *
 * Kalıcı çözüm (bu modülün sözleşmesi):
 *   - Akıştaki hiçbir blokta minPresenceAhead kullanılmaz.
 *   - Bloklar arası boşluk marginBottom ile değil, blokların ARASINA konan
 *     boşluk View'ı (spacer) ile verilir. Spacer sayfa sonunda kalır, sonraki
 *     sayfanın başına taşınmaz.
 *   - Bütün halinde taşınması istenen bölüme wrap={false} verilir; ancak bu
 *     yalnızca bölüm bir sayfaya sığıyorsa güvenlidir (aksi halde react-pdf
 *     içeriği taşırır). Karar `canRenderAtomically` ile verilir.
 */

import { CV_PAGE_PADDING_X_PT, CV_PAGE_PADDING_BOTTOM_PT, CV_PAGE_PADDING_TOP_PT } from '../cvPhoto';

/** A4 (pt) */
export const CV_A4_WIDTH_PT = 595.28;
export const CV_A4_HEIGHT_PT = 841.89;

/** Akışa açık içerik genişliği */
export const CV_CONTENT_WIDTH_PT = CV_A4_WIDTH_PT - CV_PAGE_PADDING_X_PT * 2;

/**
 * 1. sayfanın içerik yüksekliği (en dar sayfa). Bölüm atomik yapılabilir mi
 * kararı bu değere göre verilir; sonraki sayfalarda alan daha fazladır.
 */
export const CV_CONTENT_HEIGHT_PT =
  CV_A4_HEIGHT_PT - CV_PAGE_PADDING_TOP_PT - CV_PAGE_PADDING_BOTTOM_PT;

/** Badge iç yatay padding (skillBadge stiliyle aynı) */
const BADGE_PADDING_X_PT = 7;
/** Badge iç dikey padding (skillBadge stiliyle aynı) */
const BADGE_PADDING_Y_PT = 3;
/** Badge satırları arası boşluk */
export const CV_BADGE_ROW_GAP_PT = 5;
const BADGE_ROW_GAP_PT = CV_BADGE_ROW_GAP_PT;
/** Aynı satırdaki badge'ler arası boşluk (skillBadge marginRight) */
const BADGE_GAP_PT = 5;

/** Calibri/Carlito ortalama glif genişliği (~0.45em) */
const AVG_GLYPH_WIDTH_RATIO = 0.45;
/** Satır yüksekliği çarpanı — react-pdf varsayılanı (Carlito) */
const DEFAULT_LINE_HEIGHT_RATIO = 1.2;

/**
 * Badge'leri flexWrap kullanmadan satırlara böler.
 * flexWrap + wrap={false} birleşiminde react-pdf yüksekliği yanlış hesaplar;
 * satırları önceden bölmek bu belirsizliği tamamen kaldırır.
 */
export function chunkBadgeLabels(
  labels: string[],
  fontSizePt: number,
  maxWidthPt: number = CV_CONTENT_WIDTH_PT
): string[][] {
  const charWidthPt = fontSizePt * AVG_GLYPH_WIDTH_RATIO;
  const rows: string[][] = [];
  let row: string[] = [];
  let rowWidthPt = 0;

  for (const label of labels) {
    const badgeWidthPt =
      BADGE_PADDING_X_PT * 2 + Math.max(label.length * charWidthPt, fontSizePt);
    const neededPt = row.length === 0 ? badgeWidthPt : badgeWidthPt + BADGE_GAP_PT;
    if (row.length > 0 && rowWidthPt + neededPt > maxWidthPt) {
      rows.push(row);
      row = [label];
      rowWidthPt = badgeWidthPt;
    } else {
      row.push(label);
      rowWidthPt += neededPt;
    }
  }
  if (row.length > 0) rows.push(row);
  return rows;
}

/** Bölüm başlığı (sectionTitle) yüksekliği: metin + paddingBottom + border + marginBottom */
export function estimateSectionTitleHeightPt(headingFontPt: number): number {
  const textPt = headingFontPt * DEFAULT_LINE_HEIGHT_RATIO;
  const paddingBottomPt = 2;
  const borderPt = 1;
  const marginBottomPt = 6;
  return textPt + paddingBottomPt + borderPt + marginBottomPt;
}

/** Tek badge satırının yüksekliği */
export function estimateBadgeRowHeightPt(badgeFontPt: number): number {
  return badgeFontPt * DEFAULT_LINE_HEIGHT_RATIO + BADGE_PADDING_Y_PT * 2;
}

/** Başlık + badge satırlarından oluşan bölümün toplam yüksekliği */
export function estimateBadgeSectionHeightPt(
  rowCount: number,
  headingFontPt: number,
  badgeFontPt: number
): number {
  if (rowCount <= 0) return 0;
  const rowsPt = rowCount * estimateBadgeRowHeightPt(badgeFontPt);
  const gapsPt = (rowCount - 1) * BADGE_ROW_GAP_PT;
  return estimateSectionTitleHeightPt(headingFontPt) + rowsPt + gapsPt;
}

/** Düz metnin sarma sonrası yüksekliği */
export function estimateTextHeightPt(
  text: string,
  fontSizePt: number,
  lineHeightRatio: number = DEFAULT_LINE_HEIGHT_RATIO,
  maxWidthPt: number = CV_CONTENT_WIDTH_PT
): number {
  if (!text) return 0;
  const charWidthPt = fontSizePt * AVG_GLYPH_WIDTH_RATIO;
  const charsPerLine = Math.max(1, Math.floor(maxWidthPt / charWidthPt));
  const explicitLines = text.split('\n');
  const lineCount = explicitLines.reduce(
    (total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)),
    0
  );
  return lineCount * fontSizePt * lineHeightRatio;
}

/** Başlık + düz metin bölümünün yüksekliği */
export function estimateTextSectionHeightPt(
  text: string,
  headingFontPt: number,
  bodyFontPt: number,
  lineHeightRatio?: number
): number {
  if (!text) return 0;
  return (
    estimateSectionTitleHeightPt(headingFontPt) +
    estimateTextHeightPt(text, bodyFontPt, lineHeightRatio)
  );
}

/**
 * Tahmin hatasına karşı pay. Tahmin gerçek yükseklikten küçük çıkarsa
 * wrap={false} bölüm sayfayı taşırabilir; bu yüzden sığma eşiği düşük tutulur.
 */
const ATOMIC_SAFETY_RATIO = 0.85;

/**
 * Bölüm bütün halinde (wrap={false}) render edilebilir mi?
 * Yalnızca tek sayfaya rahat sığan bölümler atomik yapılır; büyük bölümler
 * react-pdf'in doğal akışında parçalanır (taşma / kırpılma olmaz).
 */
export function canRenderAtomically(
  estimatedHeightPt: number,
  contentHeightPt: number = CV_CONTENT_HEIGHT_PT
): boolean {
  return estimatedHeightPt > 0 && estimatedHeightPt <= contentHeightPt * ATOMIC_SAFETY_RATIO;
}
