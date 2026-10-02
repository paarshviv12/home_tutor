const jwt = require("jsonwebtoken");

// Reads "Authorization: Bearer <token>", verifies it and puts { id, role, email } on req.user
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET || "mysecretkey");
        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid token" });
    }
};

module.exports = authMiddleware;
