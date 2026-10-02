const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Parent = require("../models/Parent");
const Tutor = require("../models/Tutor");
const { resumeFromFile } = require("../middleware/uploadMiddleware");

const signToken = (user, role) =>
    jwt.sign(
        { id: user._id, role, email: user.email },
        process.env.JWT_SECRET || "mysecretkey",
        { expiresIn: "7d" }
    );

const toList = (value) =>
    Array.isArray(value)
        ? value.map((v) => String(v).trim()).filter(Boolean)
        : String(value || "").split(",").map((v) => v.trim()).filter(Boolean);

// POST /api/auth/register  — body.role = "parent" (default) or "tutor"
const register = async (req, res) => {
    try {
        const body = req.body || {}; // undefined in Express 5 when no body parser ran
        const { name, email, password, role = "parent" } = body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email and password are required" });
        }

        const taken = (await Parent.findOne({ email })) || (await Tutor.findOne({ email }));
        if (taken) {
            return res.status(400).json({ message: "An account with this email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        if (role === "tutor") {
            const subjects = toList(body.subjects);
            const availableSlots = toList(body.availableSlots);
            const { locality } = body;

            if (!subjects.length || !locality || !availableSlots.length) {
                return res.status(400).json({ message: "Subjects, locality and at least one slot are required" });
            }
            if (!req.file) {
                return res.status(400).json({ message: "Please upload your resume (PDF, Word, PNG or JPG)" });
            }

            const tutor = await Tutor.create({
                name,
                email,
                password: hashedPassword,
                subjects,
                locality,
                availableSlots,
                resume: resumeFromFile(req.file)
            });

            return res.status(201).json({
                message: "Tutor registered successfully",
                token: signToken(tutor, "tutor"),
                user: { id: tutor._id, name: tutor.name, email: tutor.email, role: "tutor" }
            });
        }

        const parent = await Parent.create({
            name,
            email,
            password: hashedPassword
        });

        res.status(201).json({
            message: "User registered successfully",
            token: signToken(parent, "parent"),
            user: { id: parent._id, name: parent.name, email: parent.email, role: "parent" }
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // If the person picked "Parent" or "Tutor" on the sign-in screen, only look there
        const wanted = (req.body || {}).role;
        let user = null;
        let role = "parent";

        if (wanted !== "tutor") {
            user = await Parent.findOne({ email });
        }
        if (!user && wanted !== "parent") {
            user = await Tutor.findOne({ email });
            role = "tutor";
        }

        if (!user) {
            return res.status(400).json({
                message: wanted ? `No ${wanted} account found with this email` : "User not found"
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = signToken(user, role);

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    register,
    login
};
