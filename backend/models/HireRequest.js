const mongoose = require("mongoose");

const hireRequestSchema = new mongoose.Schema({
    tutor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tutor",
        required: true
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Parent",
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    slot: {
        type: String,
        required: true
    },
    message: {
        type: String
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending"
    }
}, { timestamps: true });

module.exports = mongoose.model("HireRequest", hireRequestSchema);
