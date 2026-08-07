const mongoose = require("mongoose");

const PAGE_TYPES = [
  "homepage",
  "careers",
  "contact",
  "about",
  "blog",
  "products",
  "team",
  "other",
];

/**
 * To Do Başvuruları — proje altında girilen firma satırları
 * (şirket URL + sayfa tipi + ana domain).
 */
const todoApplicationItemSchema = new mongoose.Schema(
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
    companyUrl: {
      type: String,
      required: true,
      trim: true,
    },
    pageType: {
      type: String,
      enum: PAGE_TYPES,
      default: "careers",
    },
    pageTypeOther: {
      type: String,
      trim: true,
      default: "",
    },
    /** info@firma.com veya firma.com */
    emailDomainInput: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    companyName: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    archived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "todo_application_items",
  }
);

todoApplicationItemSchema.index({ clientId: 1, projectId: 1, archived: 1, sortOrder: 1 });
todoApplicationItemSchema.index({ clientId: 1, projectId: 1, createdAt: -1 });

const TodoApplicationItem = mongoose.model(
  "TodoApplicationItem",
  todoApplicationItemSchema
);

module.exports = TodoApplicationItem;
module.exports.PAGE_TYPES = PAGE_TYPES;
