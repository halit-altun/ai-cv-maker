const express = require("express");
const {
  registerHandler,
  verifyEmailHandler,
  resendVerificationHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  logoutAllHandler,
  meHandler,
  updateMeHandler,
  uploadMePhotoHandler,
  deleteMePhotoHandler,
  changePasswordHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
} = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/register", registerHandler);
router.post("/verify-email", verifyEmailHandler);
router.post("/resend-verification", resendVerificationHandler);
router.post("/login", loginHandler);
router.post("/refresh", refreshHandler);
router.post("/logout", logoutHandler);
router.post("/logout-all", requireAuth, logoutAllHandler);

router.get("/me", requireAuth, meHandler);
router.patch("/me", requireAuth, updateMeHandler);
router.post("/me/photo", requireAuth, uploadMePhotoHandler);
router.delete("/me/photo", requireAuth, deleteMePhotoHandler);

router.post("/change-password", requireAuth, changePasswordHandler);
router.post("/forgot-password", forgotPasswordHandler);
router.post("/reset-password", resetPasswordHandler);

module.exports = router;
