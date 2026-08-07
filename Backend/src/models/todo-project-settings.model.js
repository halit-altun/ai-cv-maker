const mongoose = require("mongoose");

/**
 * To Do proje ayarları — proje başına bir CV PDF.
 * Bulk başvuru bu CV üzerinden uyarlayıp gönderir.
 */
const todoProjectSettingsSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OutreachProject",
      required: true,
      index: true,
    },
    cvFileName: {
      type: String,
      trim: true,
      default: "",
    },
    cvTitle: {
      type: String,
      trim: true,
      default: "",
    },
    pdfAttachment: {
      filename: { type: String, default: "" },
      contentBase64: { type: String, default: "" },
      contentType: { type: String, default: "application/pdf" },
    },
    uploadedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "todo_project_settings",
  }
);

todoProjectSettingsSchema.index({ clientId: 1, projectId: 1 }, { unique: true });

const TodoProjectSettings = mongoose.model(
  "TodoProjectSettings",
  todoProjectSettingsSchema
);

module.exports = TodoProjectSettings;
