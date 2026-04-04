const express = require("express");
const { authenticate } = require("../../middleware/authenticate");
const { authorize } = require("../../middleware/authorize");
const ctrl = require("./leave.controller");
const router = express.Router();

router.use(authenticate);
router.get("/types", ctrl.getTypes);
router.post("/types", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.createType);
router.patch(
  "/types/:id",
  authorize("HR_ADMIN", "SUPER_ADMIN"),
  ctrl.updateType,
);

router.post("/apply", ctrl.applyLeave);
router.get("/my-requests", ctrl.getMyRequests);
router.get("/mine", ctrl.getMyRequests); // Alias for frontend compatibility 
router.get("/my-balances", ctrl.getMyBalances);

// Admin controls for leave balances
router.get(
  "/balances/:employeeId",
  authorize("HR_ADMIN", "SUPER_ADMIN"),
  ctrl.getEmployeeBalances,
);
router.patch(
  "/balances/:id",
  authorize("HR_ADMIN", "SUPER_ADMIN"),
  ctrl.updateLeaveBalance,
);
router.get(
  "/pending-approvals",
  authorize("MANAGER", "HR_ADMIN", "SUPER_ADMIN"),
  ctrl.getPendingApprovals,
);
router.get(
  "/team",
  authorize("MANAGER", "HR_ADMIN", "SUPER_ADMIN"),
  ctrl.getTeamLeaves,
);
router.get("/all", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.getAllRequests);

router.patch(
  "/:id/decide",
  authorize("MANAGER", "HR_ADMIN", "SUPER_ADMIN"),
  ctrl.decideLeave,
);
router.delete("/:id", ctrl.cancelLeave);

module.exports = router;
