const HireRequest = require("../models/HireRequest");
const Tutor = require("../models/Tutor");

const createHireRequest = async (req, res) => {
    try {
        const { tutor, subject, slot, message } = req.body;

        if (!tutor || !subject || !slot) {
            return res.status(400).json({ message: "Tutor, subject and slot are required" });
        }

        const tutorData = await Tutor.findById(tutor);
        if (!tutorData) {
            return res.status(404).json({ message: "Tutor not found" });
        }

        if (!tutorData.availableSlots.includes(slot)) {
            return res.status(400).json({ message: "Selected slot is not available for this tutor" });
        }

        const hireRequest = await HireRequest.create({
            tutor,
            parent: req.user.id,
            subject,
            slot,
            message
        });

        res.status(201).json(hireRequest);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMyRequests = async (req, res) => {
    try {
        const filter = req.user.role === "parent" 
            ? { parent: req.user.id } 
            : { tutor: req.user.id };

        const requests = await HireRequest.find(filter)
            .populate("tutor", "-password")
            .populate("parent", "-password")
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const acceptHireRequest = async (req, res) => {
    try {
        const request = await HireRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ message: "Hire request not found" });
        }

        if (request.tutor.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized to accept this request" });
        }

        const existingBooking = await HireRequest.findOne({
            tutor: request.tutor,
            slot: request.slot,
            status: "accepted"
        });

        if (existingBooking) {
            return res.status(409).json({ message: "Tutor already has an accepted student for this time slot" });
        }

        request.status = "accepted";
        await request.save();

        res.json({ message: "Hire request accepted", request });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const rejectHireRequest = async (req, res) => {
    try {
        const request = await HireRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ message: "Hire request not found" });
        }

        if (request.tutor.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized to reject this request" });
        }

        request.status = "rejected";
        await request.save();

        res.json({ message: "Hire request rejected", request });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createHireRequest,
    getMyRequests,
    acceptHireRequest,
    rejectHireRequest
};
