const mongoose = require("mongoose");

const tutorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    subjects: { type: [String], required: true },
    locality: { type: String, required: true },
    availableSlots: { type: [String], required: true },
    resume: {
        fileUrl: String,
        originalName: String,
        mimeType: String,
        size: Number,
        uploadedAt: Date
    }
});

module.exports = mongoose.model("Tutor", tutorSchema);
