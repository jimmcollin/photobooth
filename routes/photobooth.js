const express = require("express");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const catchAsync = require("../utils/catchAsync");
const photobooth = require("../controllers/photobooth");

const router = express.Router();

router.get("/", catchAsync(photobooth.index));

router.post("/select", upload.single("image"), catchAsync(photobooth.selectPhoto));

router.post("/upload", upload.single("photo"), catchAsync(photobooth.uploadImage));

router.get("/new", catchAsync(photobooth.renderNewForm));

router.get("/preview-image", catchAsync(photobooth.streamPreviewImage));

router.post("/details", catchAsync(photobooth.saveDetails));

// Gallery - view all sessions
router.get("/gallery", catchAsync(photobooth.getAllSessions));

// API endpoints (optional - if you want JSON responses)
router.get("/api/sessions", catchAsync(photobooth.getSessionsJSON));
router.get("/api/sessions/:id", catchAsync(photobooth.getSessionJSON));

// View single session - MUST BE LAST among GET routes with /:id pattern
router.get("/:id", catchAsync(photobooth.getSession));

// Stream image for a specific session
router.get("/:id/image", catchAsync(photobooth.streamSessionImage));

module.exports = router;