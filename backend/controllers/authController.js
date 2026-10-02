const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Parent = require("../models/Parent");
const Tutor = require("../models/Tutor");

// "Maths, Physics" → ["Maths", "Physics"]
const toList = (value) => String(value || "").split(",").map((v) => v.trim()).filter(Boolean);

// Token + user details sent back after register and login
const authReply = (user, role) => ({
    token: jwt.sign({ id: user._id, role, email: user.email }, process.env.JWT_SECRET || "mysecretkey", { expiresIn: "7d" }),
    user: { id: user._id, name: user.name, email: user.email, role }
});

// POST /api/auth/register — parents send JSON; tutors send multipart form data with a "resume" file
const register = async (req, res) => {
    try {
        const { name, email, password, role = "parent", locality } = req.body || {};
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email and password are required" });
        }
        if ((await Parent.findOne({ email })) || (await Tutor.findOne({ email }))) {
            return res.status(400).json({ message: "An account with this email already exists" });
        }

        const hashed = await bcrypt.hash(password, 10);

        if (role !== "tutor") {
            const parent = await Parent.create({ name, email, password: hashed });
            return res.status(201).json({ message: "Parent registered", ...authReply(parent, "parent") });
        }

        const subjects = toList(req.body.subjects);
        const availableSlots = toList(req.body.availableSlots);
        if (!subjects.length || !locality || !availableSlots.length) {
            return res.status(400).json({ message: "Subjects, locality and at least one slot are required" });
        }
        if (!req.file) {
            return res.status(400).json({ message: "Please upload your resume (PDF, Word, PNG or JPG)" });
        }

        const tutor = await Tutor.create({
            name, email, password: hashed, subjects, locality, availableSlots,
            resume: {
                fileUrl: `/uploads/resumes/${req.file.filename}`,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                size: req.file.size,
                uploadedAt: new Date()
            }
        });
        res.status(201).json({ message: "Tutor registered", ...authReply(tutor, "tutor") });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// POST /api/auth/login — role "parent" or "tutor" picks which collection to search
const login = async (req, res) => {
    try {
        const { email, password, role } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // No role given (e.g. Postman) → try parent first, then tutor
        let user = role !== "tutor" ? await Parent.findOne({ email }) : null;
        let foundRole = "parent";
        if (!user && role !== "parent") {
            user = await Tutor.findOne({ email });
            foundRole = "tutor";
        }

        if (!user) return res.status(400).json({ message: role ? `No ${role} account found with this email` : "User not found" });
        if (!(await bcrypt.compare(password, user.password))) return res.status(400).json({ message: "Invalid credentials" });

        res.json({ message: "Login successful", ...authReply(user, foundRole) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { register, login };
