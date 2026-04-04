const express = require("express");
const { authenticate } = require("../../middleware/authenticate");
const { authorize } = require("../../middleware/authorize");
const ctrl = require("./onboarding.controller");
const router = express.Router();

router.use(authenticate);

router.get("/my-tasks", ctrl.getMyTasks);
router.get("/tasks", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.getAllTasks);
router.post("/tasks", authorize("HR_ADMIN", "SUPER_ADMIN"), ctrl.createTask);
router.patch("/tasks/:id/status", ctrl.updateTaskStatus);
router.get(
  "/employee/:id",
  authorize("MANAGER", "HR_ADMIN", "SUPER_ADMIN"),
  ctrl.getEmployeeTasks,
);
router.get(
  "/overdue",
  authorize("HR_ADMIN", "SUPER_ADMIN"),
  ctrl.getOverdueTasks,
);
router.delete(
  "/tasks/:id",
  authorize("HR_ADMIN", "SUPER_ADMIN"),
  ctrl.deleteTask,
);

module.exports = router;
