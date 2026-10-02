const multer = require("multer");
const path = require("path");
const RESUME_DIR = path.join(__dirname, "..", "uploads", "resumes");

const ALLOWED = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "image/png": ".png",
    "image/jpeg": ".jpg"
};

const storage = multer.diskStorage({
    destination: RESUME_DIR,
    filename: (req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `resume-${unique}${ALLOWED[file.mimetype]}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (ALLOWED[file.mimetype]) return cb(null, true);
    const err = new Error("Resume must be a PDF, Word document, PNG or JPG");
    err.status = 400;
    cb(err);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});
const uploadResume = (req, res, next) => {
    upload.single("resume")(req, res, (err) => {
        if (!err) return next();
        if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ message: "Resume must be smaller than 5 MB" });
        }
        res.status(err.status || 400).json({ message: err.message });
    });
};

const resumeFromFile = (file) => ({
    fileUrl: `/uploads/resumes/${file.filename}`,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    uploadedAt: new Date()
});

module.exports = { uploadResume, resumeFromFile, RESUME_DIR };
