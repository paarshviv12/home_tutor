const Tutor = require("../models/Tutor");

// GET /api/tutors?subject=Maths&locality=Kharghar
const getTutors = async (req, res) => {
    try {
        const { subject, locality } = req.query;
        const filter = {};
        if (subject) filter.subjects = subject; // matches tutors whose subjects array contains it
        if (locality) filter.locality = locality;

        res.json(await Tutor.find(filter).select("-password"));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/tutors/:id
const getTutorById = async (req, res) => {
    try {
        const tutor = await Tutor.findById(req.params.id).select("-password");
        if (!tutor) return res.status(404).json({ message: "Tutor not found" });
        res.json(tutor);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/tutors — quick way to add a tutor from Postman
const createTutor = async (req, res) => {
    try {
        const { password, ...tutor } = (await Tutor.create(req.body)).toObject();
        res.status(201).json(tutor);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = { getTutors, getTutorById, createTutor };
