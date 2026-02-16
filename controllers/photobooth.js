const mongoose = require("mongoose");
const { Readable } = require("stream");
const Photobooth = require("../models/photobooth");
const { getBucket } = require("../gridfs");
const sharp = require("sharp");

module.exports.index = async (req, res) => {
  res.render("photobooth/index");
};

module.exports.selectPhoto = async (req, res) => {
  if (!req.file) return res.status(400).send("No image uploaded.");

  const processBuffer = await sharp(req.file.buffer)
    .resize({ width: 800 })
    .jpeg({ quality: 60 })
    .toBuffer();

  console.log("Processed buffer length:", processBuffer.length);

  // Store in GridFS immediately
  const bucket = getBucket();
  const uploadStream = bucket.openUploadStream(`temp-${Date.now()}.jpeg`, {
    contentType: "image/jpeg"
  });

  uploadStream.end(processBuffer);

  // Wait for upload to complete
  await new Promise((resolve, reject) => {
    uploadStream.on("finish", resolve);
    uploadStream.on("error", reject);
  });

  // Store only the file ID in session
  req.session.selectedImageFileId = uploadStream.id.toString();
  
  console.log("Stored file ID in session:", req.session.selectedImageFileId);

  // Explicitly save session before responding
  req.session.save((err) => {
    if (err) {
      console.error("Session save error:", err);
      return res.status(500).json({ error: "Failed to save session" });
    }
    // Return success JSON instead of redirecting
    res.json({ success: true, redirect: '/photosession/new' });
  });
};

module.exports.renderNewForm = async (req, res) => {
  console.log("renderNewForm - session.selectedImageFileId:", req.session.selectedImageFileId);
  console.log("renderNewForm - hasImage will be:", !!req.session.selectedImageFileId);
  res.render("photobooth/new", { hasImage: !!req.session.selectedImageFileId });
};

module.exports.streamPreviewImage = async (req, res) => {
  if (!req.session.selectedImageFileId) return res.sendStatus(404);

  const fileId = new mongoose.Types.ObjectId(req.session.selectedImageFileId);

  res.set("Content-Type", "image/jpeg");
  getBucket().openDownloadStream(fileId).pipe(res);
};

module.exports.saveDetails = async (req, res) => {
  const { memberName, memberEmail, comment } = req.body;

  if (!req.session.selectedImageFileId) {
    return res.status(400).send("No image in session");
  }

  const sessionDoc = await Photobooth.create({
    memberName,
    memberEmail,
    comment,
    sessionDate: new Date(),
    imageObjId: new mongoose.Types.ObjectId(req.session.selectedImageFileId)
  });

  // cleanup session
  req.session.selectedImageFileId = null;

  res.redirect(`/photosession/${sessionDoc._id}`);

};

// Get all photo sessions
module.exports.getAllSessions = async (req, res) => {
  const sessions = await Photobooth.find({}).sort({ sessionDate: -1 });
  res.render("photobooth/gallery", { sessions });
};

// Get a single photo session by ID
module.exports.getSession = async (req, res) => {
  const session = await Photobooth.findById(req.params.id);
  
  if (!session) {
    req.flash("error", "Photo session not found");
    return res.redirect("/photosession");
  }
  
  res.render("photobooth/show", { session });
};

// Stream image by session ID
module.exports.streamSessionImage = async (req, res) => {
  const session = await Photobooth.findById(req.params.id);
  
  if (!session || !session.imageObjId) {
    return res.sendStatus(404);
  }

  const fileId = new mongoose.Types.ObjectId(session.imageObjId);
  
  res.set("Content-Type", "image/jpeg");
  getBucket().openDownloadStream(fileId).pipe(res);
};

// Get sessions as JSON (API endpoint)
module.exports.getSessionsJSON = async (req, res) => {
  const sessions = await Photobooth.find({}).sort({ sessionDate: -1 });
  res.json(sessions);
};

// Get single session as JSON (API endpoint)
module.exports.getSessionJSON = async (req, res) => {
  const session = await Photobooth.findById(req.params.id);
  
  if (!session) {
    return res.status(404).json({ error: "Photo session not found" });
  }

  res.json(session);
};

// Show success page with session details
module.exports.showSuccess = async (req, res) => {
  const session = await Photobooth.findById(req.params.id);
  
  if (!session) {
    req.flash("error", "Photo session not found");
    return res.redirect("/photosession");
  }
  
  res.render("photobooth/success", { session });
};

module.exports.uploadImage = async (req, res) => {
  // Validate file exists
  if (!req.file) {
    req.flash("error", "No image uploaded");
    return res.redirect('/photosession');
  }

  // Validate file type
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (!allowedMimes.includes(req.file.mimetype)) {
    req.flash("error", "Invalid file type. Please upload a JPEG or PNG image.");
    return res.redirect('/photosession');
  }

  try {
    // Process image with sharp - resize to 800px width and compress
    const processBuffer = await sharp(req.file.buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .jpeg({ quality: 60 })
      .toBuffer();

    console.log("Uploaded file size:", req.file.size);
    console.log("Processed buffer length:", processBuffer.length);

    // Store in GridFS
    const bucket = getBucket();
    const uploadStream = bucket.openUploadStream(`upload-${Date.now()}.jpeg`, {
      contentType: "image/jpeg"
    });

    uploadStream.end(processBuffer);

    // Wait for upload to complete
    await new Promise((resolve, reject) => {
      uploadStream.on("finish", resolve);
      uploadStream.on("error", reject);
    });

    // Store file ID in session
    req.session.selectedImageFileId = uploadStream.id.toString();
    
    console.log("Stored uploaded file ID in session:", req.session.selectedImageFileId);

    res.redirect('/photosession/new');
  } catch (error) {
    console.error("Image processing error:", error);
    req.flash("error", "Error processing image. Please try again.");
    res.redirect('/photosession');
  }
};

// Delete a photo session and its image from GridFS
module.exports.deleteSession = async (req, res) => {
  const session = await Photobooth.findById(req.params.id);
  
  if (!session) {
    req.flash("error", "Photo session not found");
    return res.redirect("/photosession/gallery");
  }

  try {
    // Delete image from GridFS if it exists
    if (session.imageObjId) {
      const bucket = getBucket();
      await bucket.delete(new mongoose.Types.ObjectId(session.imageObjId));
      console.log("Deleted image from GridFS:", session.imageObjId);
    }

    // Delete the session document
    await Photobooth.findByIdAndDelete(req.params.id);
    
    req.flash("success", "Photo session deleted successfully");
    res.redirect("/photosession/gallery");
  } catch (error) {
    console.error("Error deleting session:", error);
    req.flash("error", "Error deleting photo session");
    res.redirect("/photosession/gallery");
  }
};