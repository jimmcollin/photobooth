const mongoose = require("mongoose");
const { Schema } = mongoose;

const PhotoboothSchema = new Schema(
  {
    memberName: { type: String, required: true, trim: true },
    memberEmail: { type: String, required: true, trim: true, lowercase: true },
    comment: { 
      type: String, 
      default: "",
      maxLength: [500, "Comment cannot exceed 500 characters"]
    },
    sessionDate: { type: Date, default: Date.now },

    // set AFTER upload completes
    imageObjId: { type: Schema.Types.ObjectId, default: null },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Photobooth", PhotoboothSchema);
