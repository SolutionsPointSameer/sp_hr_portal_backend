const { Router } = require("express");
const controller = require("./location.controller");
const { authenticate } = require("../../middleware/authenticate");
const { authorize } = require("../../middleware/authorize");

const router = Router();

router.use(authenticate);

// List locations (accessible to all authenticated users)
router.get("/", controller.listLocations);

// Require admin privileges to modify locations
router.use(authorize("SUPER_ADMIN", "HR_ADMIN"));

router.post("/", controller.createLocation);
router.put("/:id", controller.updateLocation);
router.delete("/:id", controller.deleteLocation);

module.exports = router;
