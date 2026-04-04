const express = require("express");
const { authenticate } = require("../../middleware/authenticate");
const { authorize } = require("../../middleware/authorize");
const ctrl = require("./settings.controller");

const router = express.Router();

router.use(authenticate);

router.get("/", authorize("SUPER_ADMIN"), ctrl.getSettings);
router.patch("/", authorize("SUPER_ADMIN"), ctrl.updateSettings);

module.exports = router;
