const express = require("express");
const { authenticate } = require("../../middleware/authenticate");
const { authorize } = require("../../middleware/authorize");
const ctrl = require("./payroll.controller");

const router = express.Router();
router.use(authenticate);

// Salary structures (HR/Admin only)
router.get("/salary-structures/:employeeId", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.getSalaryStructures);
router.post("/salary-structures", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.createSalaryStructure);
router.patch("/salary-structures/:id", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.updateSalaryStructure);

// Payroll runs (HR/Admin only)
router.get("/runs", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.listPayrollRuns);
router.post("/runs", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.createPayrollRun);
router.get("/runs/:id", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.getPayrollRun);
router.patch("/runs/:id/finalize", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.finalizePayrollRun);

// My payslips (any authenticated employee)
router.get("/my-payslips", ctrl.getMyPayslips);

module.exports = router;
