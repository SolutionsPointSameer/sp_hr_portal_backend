const express = require("express");
const { authenticate } = require("../../middleware/authenticate");
const { authorize } = require("../../middleware/authorize");
const ctrl = require("./holiday.controller");

const router = express.Router();

router.use(authenticate);

// All authenticated users can list holidays
router.get("/", ctrl.list);
router.get("/:id", ctrl.getById);

// Only Admins can modify holidays
router.post("/", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.create);
router.patch("/:id", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.update);
router.delete("/:id", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.remove);

module.exports = router;
