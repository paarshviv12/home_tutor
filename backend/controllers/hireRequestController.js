const HireRequest = require("../models/HireRequest");
const Tutor = require("../models/Tutor");

// POST /api/hire-requests — a parent sends a request (validated before saving)
const createHireRequest = async (req, res) => {
    try {
        const { tutor, subject, slot, message } = req.body;
        if (!tutor || !subject || !slot) {
            return res.status(400).json({ message: "Tutor, subject and slot are required" });
        }

        const tutorData = await Tutor.findById(tutor);
        if (!tutorData) return res.status(404).json({ message: "Tutor not found" });
        if (!tutorData.availableSlots.includes(slot)) {
            return res.status(400).json({ message: "Selected slot is not available for this tutor" });
        }

        const hireRequest = await HireRequest.create({ tutor, parent: req.user.id, subject, slot, message });
        res.status(201).json(hireRequest);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/hire-requests/my-requests — parents see what they sent, tutors see what they received
const getMyRequests = async (req, res) => {
    try {
        const filter = req.user.role === "parent" ? { parent: req.user.id } : { tutor: req.user.id };
        const requests = await HireRequest.find(filter)
            .populate("tutor", "-password")
            .populate("parent", "-password")
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PATCH /api/hire-requests/:id/accept — ownership already checked; req.hireRequest set by ownershipMiddleware
const acceptHireRequest = async (req, res) => {
    try {
        const request = req.hireRequest;

        // Business rule: only one accepted student per tutor per time slot
        const slotTaken = await HireRequest.findOne({ tutor: request.tutor, slot: request.slot, status: "accepted" });
        if (slotTaken) {
            return res.status(409).json({ message: "Tutor already has an accepted student for this time slot" });
        }

        request.status = "accepted";
        await request.save();
        res.json({ message: "Hire request accepted", request });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PATCH /api/hire-requests/:id/reject
const rejectHireRequest = async (req, res) => {
    try {
        req.hireRequest.status = "rejected";
        await req.hireRequest.save();
        res.json({ message: "Hire request rejected", request: req.hireRequest });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createHireRequest, getMyRequests, acceptHireRequest, rejectHireRequest };
