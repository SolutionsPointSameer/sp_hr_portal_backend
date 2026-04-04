const express = require("express");
const { authenticate } = require("../../middleware/authenticate");
const { authorize } = require("../../middleware/authorize");
const ctrl = require("./reports.controller");
const router = express.Router();

router.use(authenticate);
router.use(authorize("HR_ADMIN", "SUPER_ADMIN"));

router.get("/headcount", ctrl.getHeadcount);
router.get("/attendance", ctrl.getAttendanceSummary);
router.get("/leave-utilization", ctrl.getLeaveUtilization);
router.get("/payroll-cost", ctrl.getPayrollCost);
router.get("/attrition", ctrl.getAttrition);
router.get("/onboarding", ctrl.getOnboardingStatus);
router.get("/salary-metrics", authorize("SUPER_ADMIN"), ctrl.getSalaryMetrics);

module.exports = router;
