const mongoose = require("mongoose");

/**
 * Company-based outreach / analiz projeleri (ör. DUBAI).
 * Proje seçilmeden yapılan işlemler bu modele bağlanmaz.
 */
const outreachProjectSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    /** Benzersizlik için küçük harf anahtar */
    nameKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    /** Liste sıralaması — en son seçilen üstte */
    lastSelectedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    archived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "outreach_projects",
  }
);

outreachProjectSchema.index({ clientId: 1, nameKey: 1 }, { unique: true });
outreachProjectSchema.index({ clientId: 1, lastSelectedAt: -1 });

outreachProjectSchema.pre("validate", function (next) {
  if (this.name) {
    this.nameKey = String(this.name).trim().toLowerCase();
  }
  next();
});

const OutreachProject = mongoose.model("OutreachProject", outreachProjectSchema);

module.exports = OutreachProject;
