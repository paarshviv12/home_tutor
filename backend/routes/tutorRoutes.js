const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { uploadResume } = require("../middleware/uploadMiddleware");

const {
    getTutors,
    getTutorById,
    createTutor,
    getMyProfile,
    updateMyResume
} = require("../controllers/tutorController");

router.get("/", getTutors);
router.get("/me", authMiddleware, getMyProfile);          // must come before /:id
router.put("/me/resume", authMiddleware, uploadResume, updateMyResume);
router.get("/:id", getTutorById);
router.post("/", createTutor);

module.exports = router;
