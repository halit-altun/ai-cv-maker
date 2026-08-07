/**
 * Fixed CV photo: 3.5 cm vesikalık / biometric short side.
 * 3.5 cm → pt = 3.5 / 2.54 * 72 ≈ 99
 *
 * Photo is position:absolute only — never changes name / title / contact flow
 * beyond a small reserved spacer above info.
 */

/** Fixed oval photo diameter (3.5 cm) */
export const CV_PHOTO_SIZE_PT = 99;

/** @deprecated alias — always 3.5 cm */
export const CV_PHOTO_SIZE_DEFAULT_PT = CV_PHOTO_SIZE_PT;
export const CV_PHOTO_SIZE_MIN_PT = CV_PHOTO_SIZE_PT;
export const CV_PHOTO_SIZE_MAX_PT = CV_PHOTO_SIZE_PT;

/** Match preview `.cv-page` padding: 20mm */
export const CV_PAGE_PADDING_PT = Math.round((20 * 72) / 25.4); // ≈ 57

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

/** PDF page-absolute left (matches preview: padding + content left). */
export const CV_PHOTO_PAGE_LEFT_PT = CV_PAGE_PADDING_PT + CV_PHOTO_LEFT_PT;

/** PDF page-absolute top (matches preview: padding + negative header offset). */
export const CV_PHOTO_PAGE_TOP_PT = CV_PAGE_PADDING_PT + CV_PHOTO_GAP_PT;

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

