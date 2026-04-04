const express = require("express");
const { authenticate } = require("../../middleware/authenticate");
const { authorize } = require("../../middleware/authorize");
const ctrl = require("./attendance.controller");
const router = express.Router();
router.use(authenticate);
router.post("/check-in", ctrl.checkIn);
router.post("/check-out", ctrl.checkOut);
router.get("/mine", ctrl.getMine);
router.get(
  "/all",
  authorize("HR_ADMIN", "SUPER_ADMIN"),
  ctrl.getAllAttendance,
);
router.get(
  "/employee/:id",
  authorize("MANAGER", "HR_ADMIN", "SUPER_ADMIN"),
  ctrl.getEmployeeRecords,
);
router.post(
  "/regularize",
  authorize("HR_ADMIN", "SUPER_ADMIN"),
  ctrl.regularize,
);
router.get(
  "/team",
  authorize("MANAGER", "HR_ADMIN", "SUPER_ADMIN"),
  ctrl.getTeamSummary,
);
module.exports = router;
