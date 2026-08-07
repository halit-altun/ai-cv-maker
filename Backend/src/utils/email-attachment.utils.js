/**
 * Mail PDF eki — nodemailer Buffer ↔ kuyruk contentBase64 dönüşümü.
 * Kuyruk şeması yalnızca contentBase64 saklar; Buffer Mongoose'a yazılmaz.
 */

const PDF_MAGIC = Buffer.from("%PDF");

function stripDataUriBase64(value) {
  return String(value || "")
    .replace(/^data:[^;]+;base64,/i, "")
    .replace(/\s+/g, "")
    .trim();
}

function ensurePdfFilename(filename) {
  const name = String(filename || "CV.pdf").trim() || "CV.pdf";
  return /\.pdf$/i.test(name) ? name : `${name}.pdf`;
}

function isValidPdfBuffer(buf) {
  return Buffer.isBuffer(buf) && buf.length >= 5 && buf.subarray(0, 4).equals(PDF_MAGIC);
}

/**
 * Gelen ek formatını nodemailer formatına çevirir: { filename, content: Buffer, contentType }
 * Desteklenen giriş: content Buffer | contentBase64 | content (base64 string)
 */
function toNodemailerAttachment(attachment) {
  if (!attachment || typeof attachment !== "object") return null;

  const filename = ensurePdfFilename(attachment.filename);
  const contentType = String(attachment.contentType || "application/pdf").trim() || "application/pdf";

  let content = null;

  if (Buffer.isBuffer(attachment.content)) {
    content = attachment.content;
  } else if (attachment.contentBase64) {
    const raw = stripDataUriBase64(attachment.contentBase64);
    if (!raw) return null;
    content = Buffer.from(raw, "base64");
  } else if (typeof attachment.content === "string" && attachment.content.trim()) {
    const raw = stripDataUriBase64(attachment.content);
    content = Buffer.from(raw, "base64");
  }

  if (!content || content.length === 0) return null;
  if (!isValidPdfBuffer(content)) {
    const err = new Error(
      `CV eki geçerli PDF değil (boyut=${content.length}, magic=${content.subarray(0, 8).toString("latin1")}).`
    );
    err.code = "INVALID_PDF_ATTACHMENT";
    throw err;
  }

  return { filename, content, contentType };
}

/**
 * Kuyruk (Mongo) için: { filename, contentBase64, contentType }
 */
function toQueueAttachment(attachment) {
  const normalized = toNodemailerAttachment(attachment);
  if (!normalized) return null;
  return {
    filename: normalized.filename,
    contentType: normalized.contentType,
    contentBase64: normalized.content.toString("base64"),
  };
}

function normalizeAttachmentsForSend(attachments) {
  if (!Array.isArray(attachments) || !attachments.length) return undefined;
  const out = [];
  for (const att of attachments) {
    const normalized = toNodemailerAttachment(att);
    if (normalized) out.push(normalized);
  }
  return out.length ? out : undefined;
}

function serializeAttachmentsForQueue(attachments) {
  if (!Array.isArray(attachments) || !attachments.length) return [];
  const out = [];
  for (const att of attachments) {
    const serialized = toQueueAttachment(att);
    if (serialized) out.push(serialized);
  }
  return out;
}

/**
 * Frontend'den gelen { contentBase64 } → nodemailer Buffer eki.
 */
function buildPdfAttachmentFromBase64(attachment) {
  if (!attachment || !attachment.contentBase64) return null;
  return toNodemailerAttachment({
    filename: attachment.filename,
    contentBase64: attachment.contentBase64,
    contentType: attachment.contentType,
  });
}

module.exports = {
  stripDataUriBase64,
  ensurePdfFilename,
  isValidPdfBuffer,
  toNodemailerAttachment,
  toQueueAttachment,
  normalizeAttachmentsForSend,
  serializeAttachmentsForQueue,
  buildPdfAttachmentFromBase64,
};
