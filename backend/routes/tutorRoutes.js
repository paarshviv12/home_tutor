const router = require("express").Router();
const { getTutors, getTutorById, createTutor } = require("../controllers/tutorController");

router.get("/", getTutors);
router.get("/:id", getTutorById);
router.post("/", createTutor);

module.exports = router;
