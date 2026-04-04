const service = require("./leave.service");

async function getTypes(req, res, next) {
  try {
    res.json(await service.getTypes());
  } catch (err) {
    next(err);
  }
}
async function createType(req, res, next) {
  try {
    res.status(201).json(await service.createType(req.body));
  } catch (err) {
    next(err);
  }
}
async function updateType(req, res, next) {
  try {
    res.json(await service.updateType(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function applyLeave(req, res, next) {
  try {
    res
      .status(201)
      .json(await service.applyLeave({ ...req.body, employeeId: req.user.id }));
  } catch (err) {
    next(err);
  }
}
async function getMyRequests(req, res, next) {
  try {
    res.json(await service.getMyRequests(req.user.id));
  } catch (err) {
    next(err);
  }
}
async function getMyBalances(req, res, next) {
  try {
    res.json(await service.getMyBalances(req.user.id));
  } catch (err) {
    next(err);
  }
}

async function getEmployeeBalances(req, res, next) {
  try {
    res.json(await service.getEmployeeBalances(req.params.employeeId));
  } catch (err) {
    next(err);
  }
}

async function updateLeaveBalance(req, res, next) {
  try {
    res.json(await service.updateLeaveBalance(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}
async function getPendingApprovals(req, res, next) {
  try {
    res.json(await service.getPendingApprovals(req.user.id));
  } catch (err) {
    next(err);
  }
}
async function getTeamLeaves(req, res, next) {
  try {
    res.json(await service.getTeamLeaves(req.user.id));
  } catch (err) {
    next(err);
  }
}
async function getAllRequests(req, res, next) {
  try {
    res.json(await service.getAllRequests(req.query));
  } catch (err) {
    next(err);
  }
}

async function decideLeave(req, res, next) {
  try {
    res.json(await service.decideLeave(req.params.id, req.body, req.user.id, req.user.role));
  } catch (err) {
    next(err);
  }
}
async function cancelLeave(req, res, next) {
  try {
    await service.cancelLeave(req.params.id, req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTypes,
  createType,
  updateType,
  applyLeave,
  getMyRequests,
  getMyBalances,
  getEmployeeBalances,
  updateLeaveBalance,
  getPendingApprovals,
  getTeamLeaves,
  getAllRequests,
  decideLeave,
  cancelLeave,
};
