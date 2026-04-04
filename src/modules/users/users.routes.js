const express = require("express");
const { authenticate } = require("../../middleware/authenticate");
const { authorize } = require("../../middleware/authorize");
const ctrl = require("./users.controller");

const router = express.Router();

router.use(authenticate);

// Admin-only routes for user management
router.get("/", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.listUsers);
router.patch("/:id/status", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.updateUserStatus);
router.post("/:id/reset-password", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.resetPassword);

module.exports = router;
