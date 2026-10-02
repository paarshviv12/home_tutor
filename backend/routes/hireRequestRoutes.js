const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const ownershipMiddleware = require("../middleware/ownershipMiddleware");

const {
    createHireRequest,
    getMyRequests,
    acceptHireRequest,
    rejectHireRequest
} = require("../controllers/hireRequestController");

router.post("/", authMiddleware, createHireRequest);
router.get("/my-requests", authMiddleware, getMyRequests);
router.patch("/:id/accept", authMiddleware, ownershipMiddleware, acceptHireRequest);
router.patch("/:id/reject", authMiddleware, ownershipMiddleware, rejectHireRequest);

module.exports = router;
