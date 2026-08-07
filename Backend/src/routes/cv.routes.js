const express = require("express");
const {
  listCvsHandler,
  getCvHandler,
  createCvHandler,
  updateCvHandler,
  deleteCvHandler,
} = require("../controllers/cv.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireClientId } = require("../middlewares/client-id.middleware");

const router = express.Router();

router.use(requireAuth, requireClientId);

router.get("/", listCvsHandler);
router.get("/:id", getCvHandler);
router.post("/", createCvHandler);
router.patch("/:id", updateCvHandler);
router.put("/:id", updateCvHandler);
router.delete("/:id", deleteCvHandler);

module.exports = router;
