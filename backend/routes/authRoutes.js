const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/authController");
const { uploadResume } = require("../middleware/uploadMiddleware");

router.post("/register", uploadResume, register); // multipart for tutors (field "resume"), JSON for parents
router.post("/login", login);

module.exports = router;
