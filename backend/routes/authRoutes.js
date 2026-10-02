const router = require("express").Router();
const { register, login } = require("../controllers/authController");
const uploadResume = require("../middleware/uploadMiddleware");

router.post("/register", uploadResume, register); // multer reads the tutor's resume file
router.post("/login", login);

module.exports = router;
