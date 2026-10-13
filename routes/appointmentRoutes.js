const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const demoGuard = require("../middleware/demoGuard");
const asyncHandler = require("../middleware/asyncHandler");

const {
    createAppointment,
    getAppointments,
    getAppointmentById,
    deleteAppointment,
    updateAppointment,
    updateStatus
} = require("../controllers/appointmentController");

router.post(
    "/appointment",
    authMiddleware,
    roleMiddleware(["sales"]),
    asyncHandler(createAppointment)
);

router.get(
    "/appointments",
    authMiddleware,
    asyncHandler(getAppointments)
);

router.get(
    "/appointment/:id",
    authMiddleware,
    asyncHandler(getAppointmentById)
);

router.delete(
    "/appointment/:id",
    authMiddleware,
    roleMiddleware(["head"]),
    demoGuard,
    asyncHandler(deleteAppointment)
);

router.put(
    "/appointment/:id",
    authMiddleware,
    roleMiddleware(["sales"]),
    asyncHandler(updateAppointment)
);

router.put(
    "/appointment/:id/status",
    authMiddleware,
    roleMiddleware(["sales", "finance", "legal", "head"]),
    asyncHandler(updateStatus)
);

module.exports = router;