const multer = require("multer");
const path = require("path");

const ALLOWED = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "image/png": ".png",
    "image/jpeg": ".jpg"
};

const upload = multer({
    storage: multer.diskStorage({
        destination: path.join(__dirname, "..", "uploads", "resumes"),
        filename: (req, file, cb) => cb(null, `resume-${Date.now()}-${Math.round(Math.random() * 1e9)}${ALLOWED[file.mimetype]}`)
    }),
    fileFilter: (req, file, cb) =>
        ALLOWED[file.mimetype] ? cb(null, true) : cb(new Error("Resume must be a PDF, Word document, PNG or JPG")),
    limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadResume = (req, res, next) =>
    upload.single("resume")(req, res, (err) => {
        if (!err) return next();
        const message = err.code === "LIMIT_FILE_SIZE" ? "Resume must be smaller than 5 MB" : err.message;
        res.status(400).json({ message });
    });

module.exports = uploadResume;
