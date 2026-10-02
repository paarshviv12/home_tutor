const HireRequest = require("../models/HireRequest");

// Only the tutor named on a hire request may act on it.
// The loaded request is passed on as req.hireRequest so the controller doesn't fetch it again.
const ownershipMiddleware = async (req, res, next) => {
    try {
        const request = await HireRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ message: "Hire request not found" });
        if (request.tutor.toString() !== req.user.id) return res.status(403).json({ message: "Not authorized" });

        req.hireRequest = request;
        next();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = ownershipMiddleware;
