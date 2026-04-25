const service = require("./onboarding.service");

async function getMyTasks(req, res, next) {
  try {
    res.json(await service.getMyTasks(req.user.id));
  } catch (err) {
    next(err);
  }
}
async function createTask(req, res, next) {
  try {
    res.status(201).json(await service.createTask(req.body, req.user.id));
  } catch (err) {
    next(err);
  }
}
async function updateTaskStatus(req, res, next) {
  try {
    res.json(
      await service.updateTaskStatus(
        req.params.id,
        req.body.status,
        req.user.id,
        req.user.role,
      ),
    );
  } catch (err) {
    next(err);
  }
}
async function getEmployeeTasks(req, res, next) {
  try {
    res.json(await service.getEmployeeTasks(req.params.id, req.user.id, req.user.role));
  } catch (err) {
    next(err);
  }
}
async function getOverdueTasks(req, res, next) {
  try {
    res.json(await service.getOverdueTasks());
  } catch (err) {
    next(err);
  }
}
async function deleteTask(req, res, next) {
  try {
    await service.deleteTask(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function getAllTasks(req, res, next) {
  try {
    res.json(await service.getAllTasks());
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyTasks,
  createTask,
  updateTaskStatus,
  getEmployeeTasks,
  getOverdueTasks,
  getAllTasks,
  deleteTask,
};
