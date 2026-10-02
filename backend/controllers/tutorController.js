const Tutor = require("../models/Tutor");
const { resumeFromFile } = require("../middleware/uploadMiddleware");

const getTutors = async (req, res) => {
    try {
        const { subject, locality } = req.query;
        const filter = {};

        if (subject) {
            filter.subjects = subject;
        }

        if (locality) {
            filter.locality = locality;
        }

        const tutors = await Tutor.find(filter).select("-password");
        res.json(tutors);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getTutorById = async (req, res) => {
    try {
        const tutor = await Tutor.findById(req.params.id).select("-password");
        if (!tutor) {
            return res.status(404).json({ message: "Tutor not found" });
        }
        res.json(tutor);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createTutor = async (req, res) => {
    try {
        const tutor = await Tutor.create(req.body);
        const { password, ...safe } = tutor.toObject();
        res.status(201).json(safe);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// GET /api/tutors/me — the signed-in tutor's own profile
const getMyProfile = async (req, res) => {
    try {
        if (req.user.role !== "tutor") {
            return res.status(403).json({ message: "Only tutors have a tutor profile" });
        }
        const tutor = await Tutor.findById(req.user.id).select("-password");
        if (!tutor) {
            return res.status(404).json({ message: "Tutor not found" });
        }
        res.json(tutor);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PUT /api/tutors/me/resume — tutor uploads or replaces their resume file (field "resume")
const updateMyResume = async (req, res) => {
    try {
        if (req.user.role !== "tutor") {
            return res.status(403).json({ message: "Only tutors can upload a resume" });
        }
        if (!req.file) {
            return res.status(400).json({ message: "Please choose a resume file to upload" });
        }
        const tutor = await Tutor.findByIdAndUpdate(
            req.user.id,
            { resume: resumeFromFile(req.file) },
            { returnDocument: "after", runValidators: true }
        ).select("-password");
        if (!tutor) {
            return res.status(404).json({ message: "Tutor not found" });
        }
        res.json({ message: "Resume uploaded", tutor });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    getMyProfile,
    updateMyResume,
    getTutors,
    getTutorById,
    createTutor
};
