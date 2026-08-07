const mongoose = require("mongoose");

const cvSchema = new mongoose.Schema(
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
    displayTitle: {
      type: String,
      trim: true,
      default: "Untitled CV",
    },
    strengthPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    badge: {
      type: String,
      enum: ["recently-edited", null],
      default: null,
    },
    previewImageUrl: {
      type: String,
      trim: true,
      default: "",
    },
    /** CompanyBasedCVData uyumlu esnek payload */
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "cvs",
  }
);

cvSchema.index({ clientId: 1, updatedAt: -1 });

const Cv = mongoose.model("Cv", cvSchema);

module.exports = Cv;
