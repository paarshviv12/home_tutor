const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const ownership = require("../middleware/ownershipMiddleware");
const {
    createHireRequest,
    getMyRequests,
    acceptHireRequest,
    rejectHireRequest
} = require("../controllers/hireRequestController");

router.post("/", auth, createHireRequest);
router.get("/my-requests", auth, getMyRequests);
router.patch("/:id/accept", auth, ownership, acceptHireRequest);
router.patch("/:id/reject", auth, ownership, rejectHireRequest);

module.exports = router;
