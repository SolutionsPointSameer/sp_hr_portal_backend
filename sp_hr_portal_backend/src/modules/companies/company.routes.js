const { Router } = require("express");
const controller = require("./company.controller");
const { authenticate } = require("../../middleware/authenticate");
const { authorize } = require("../../middleware/authorize");

const router = Router();

router.use(authenticate);

// List companies (accessible to all authenticated users)
router.get("/", controller.listCompanies);

// Require admin privileges to modify companies
router.use(authorize("SUPER_ADMIN", "HR_ADMIN"));

router.post("/", controller.createCompany);
router.put("/:id", controller.updateCompany);
router.delete("/:id", controller.deleteCompany);

module.exports = router;
