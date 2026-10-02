const mongoose = require("mongoose");

const tutorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    subjects: {
        type: [String],
        required: true
    },
    locality: {
        type: String,
        required: true
    },
    availableSlots: {
        type: [String],
        required: true
    },
    // Uploaded resume file (via multer) — parents can open it from Find Tutors
    resume: {
        fileUrl: { type: String, default: "" },      // e.g. /uploads/resumes/resume-123.pdf
        originalName: { type: String, default: "" },
        mimeType: { type: String, default: "" },
        size: { type: Number, default: 0 },
        uploadedAt: { type: Date }
    }
});

module.exports = mongoose.model("Tutor", tutorSchema);
