/**
 * 1x1 transparent PNG base64
 * Gerçek PNG dosyası - broken image göstermemek için
 */
const TRANSPARENT_PIXEL_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

/**
 * 1x1 transparent PNG buffer
 */
function getTransparentPixelBuffer() {
  return Buffer.from(TRANSPARENT_PIXEL_BASE64, "base64");
}

/**
 * Tracking pixel response headers (no-cache)
 */
function getTrackingPixelHeaders() {
  return {
    "Content-Type": "image/png",
    "Content-Length": Buffer.byteLength(getTransparentPixelBuffer()),
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  };
}

module.exports = {
  TRANSPARENT_PIXEL_BASE64,
  getTransparentPixelBuffer,
  getTrackingPixelHeaders,
};
