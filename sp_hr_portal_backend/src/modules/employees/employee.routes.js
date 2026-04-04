const express = require("express");
const { authenticate } = require("../../middleware/authenticate");
const { authorize } = require("../../middleware/authorize");
const ctrl = require("./employee.controller");
const multer = require("multer");

const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_DOCUMENT_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_DOCUMENT_MIME_TYPES.has(file.mimetype)) {
      return cb(
        new multer.MulterError(
          "LIMIT_UNEXPECTED_FILE",
          "Only PDF, DOC, DOCX, JPG, and PNG documents are allowed",
        ),
      );
    }

    cb(null, true);
  },
});

function uploadSingleDocument(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          error: `Document exceeds the ${MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024)} MB limit`,
        });
      }

      return res.status(400).json({
        error: "Only PDF, DOC, DOCX, JPG, and PNG files up to 10 MB are allowed",
      });
    }

    next(err);
  });
}

const router = express.Router();

router.use(authenticate);

router.get("/", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.list);
router.get("/org-chart", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.getOrgChart);
router.get("/me", ctrl.getMe);
router.get("/:id", ctrl.getById);
router.post("/", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.create);
router.patch("/:id", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.update);
router.patch("/:id/onboarding-complete", ctrl.completeOnboarding);
router.delete("/:id", authorize("SUPER_ADMIN"), ctrl.remove);

// Documents
router.post(
  "/me/documents",
  uploadSingleDocument,
  ctrl.uploadMyDocument
);

router.get(
  "/:id/documents",
  authorize("HR_ADMIN", "SUPER_ADMIN"),
  ctrl.listDocuments,
);
router.post(
  "/:id/documents/upload-url",
  authorize("HR_ADMIN", "SUPER_ADMIN"),
  ctrl.getUploadUrl,
);
router.post(
  "/:id/documents",
  authorize("HR_ADMIN", "SUPER_ADMIN"),
  ctrl.saveDocumentRecord,
);
router.delete(
  "/:id/documents/:docId",
  authorize("HR_ADMIN", "SUPER_ADMIN"),
  ctrl.deleteDocument,
);

module.exports = router;
