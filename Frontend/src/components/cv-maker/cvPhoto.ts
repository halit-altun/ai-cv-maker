/**
 * Fixed CV photo: 3.5 cm vesikalık / biometric short side.
 * 3.5 cm → pt = 3.5 / 2.54 * 72 ≈ 99
 *
 * Photo is position:absolute only — never changes name / title / contact flow
 * beyond a small reserved spacer above info.
 */

/** CSS px → PDF/react-pdf pt (1in = 96 CSS px = 72 pt) */
export function cssPxToPt(px: number): number {
  return (px * 72) / 96;
}

/** PDF pt → CSS px (ölçüm / doğrulama) */
export function ptToCssPx(pt: number): number {
  return (pt * 96) / 72;
}

/** Fixed oval photo diameter (3.5 cm) */
export const CV_PHOTO_SIZE_PT = 99;

/** @deprecated alias — always 3.5 cm */
export const CV_PHOTO_SIZE_DEFAULT_PT = CV_PHOTO_SIZE_PT;
export const CV_PHOTO_SIZE_MIN_PT = CV_PHOTO_SIZE_PT;
export const CV_PHOTO_SIZE_MAX_PT = CV_PHOTO_SIZE_PT;

/** Hedef kenar boşlukları (CSS px) — PDF'te pt'ye çevrilir */
export const CV_PAGE_PADDING_BOTTOM_PX = 50;
export const CV_PAGE_PADDING_X_PX = 33;

/**
 * Vertical page padding top — eski hali (20mm ≈ 57pt).
 * Fotoğraf / ad-ünvan konumu buna bağlı; değiştirilmemeli.
 */
export const CV_PAGE_PADDING_TOP_PT = Math.round((20 * 72) / 25.4); // ≈ 57

/** Preview CSS için üst boşluk (20mm, eski hali) */
export const CV_PAGE_PADDING_TOP_CSS = '20mm';

/** Vertical page padding bottom (all pages) — tam 57 CSS px */
export const CV_PAGE_PADDING_BOTTOM_PT = cssPxToPt(CV_PAGE_PADDING_BOTTOM_PX); // 42.75

/** @deprecated use CV_PAGE_PADDING_TOP_PT — photo / top math */
export const CV_PAGE_PADDING_Y_PT = CV_PAGE_PADDING_TOP_PT;

/** Horizontal page padding (left/right) — tam 33 CSS px */
export const CV_PAGE_PADDING_X_PT = cssPxToPt(CV_PAGE_PADDING_X_PX); // 24.75

/** Ana bölümler arası sabit boşluk (Hakkımda ↔ Deneyim ↔ Eğitim ↔ …) */
export const CV_SECTION_GAP_PT = 10;

/** Aynı bölüm içindeki deneyim / eğitim kayıtları arası */
export const CV_ITEM_GAP_PT = 12;

/** Deneyim maddeleri (bullet) arası */
export const CV_BULLET_GAP_PT = 3;

/** @deprecated use CV_PAGE_PADDING_TOP_PT */
export const CV_PAGE_PADDING_PT = CV_PAGE_PADDING_TOP_PT;

/**
 * 2. (ve sonraki) sayfada akan içeriğin üst boşluğu.
 * react-pdf wrap’te View paddingTop yalnızca 1. sayfada uygulanır; sıfırdan başlamasın.
 */
export const CV_CONTINUATION_PAGE_TOP_PT = 25;

/** Where the photo bottom sits (above info). */
export const CV_PHOTO_BOTTOM_ALIGN_PT = 48;

/** Small gap between photo bottom and city/phone (info) start. */
export const CV_PHOTO_TO_INFO_GAP_PT = 5;

/**
 * Height reserved above contact (info start) = photo bottom + tiny gap.
 * Name/title are vertically centered in [photo top → photo bottom].
 */
export const CV_IDENTITY_BEFORE_CONTACT_PT =
  CV_PHOTO_BOTTOM_ALIGN_PT + CV_PHOTO_TO_INFO_GAP_PT;

/**
 * Absolute `top` for the photo only (negative = up into page padding).
 */
export const CV_PHOTO_GAP_PT = -(CV_PHOTO_SIZE_PT - CV_PHOTO_BOTTOM_ALIGN_PT);

/**
 * Left inset inside the header — 0 = flush with experience/content left edge.
 */
export const CV_PHOTO_LEFT_PT = 0;

/** PDF page-absolute left (matches preview: horizontal padding + content left). */
export const CV_PHOTO_PAGE_LEFT_PT = CV_PAGE_PADDING_X_PT + CV_PHOTO_LEFT_PT;

/** PDF page-absolute top (matches preview: vertical padding + negative header offset). */
export const CV_PHOTO_PAGE_TOP_PT = CV_PAGE_PADDING_TOP_PT + CV_PHOTO_GAP_PT;

/** Same blue as CV title / profile title */
export const CV_PHOTO_FRAME_COLOR = '#2c5aa0';
/** Oval frame around the photo */
export const CV_PHOTO_FRAME_WIDTH_PT = 1.85;

export type CvPhotoSizePt = number;

export function clampCvPhotoSizePt(_value?: unknown): number {
  return CV_PHOTO_SIZE_PT;
}

export function resolveCvPhotoSizePt(
  _personalInfo?: { photoSizePt?: number | null } | null
): number {
  return CV_PHOTO_SIZE_PT;
}

