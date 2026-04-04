const service = require("./reports.service");

async function getHeadcount(req, res, next) {
  try {
    res.json(await service.getHeadcount());
  } catch (err) {
    next(err);
  }
}
async function getAttendanceSummary(req, res, next) {
  const month = parseInt(req.query.month) || new Date().getMonth() + 1;
  const year = parseInt(req.query.year) || new Date().getFullYear();
  try {
    res.json(await service.getAttendanceSummary(month, year));
  } catch (err) {
    next(err);
  }
}
async function getLeaveUtilization(req, res, next) {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  try {
    res.json(await service.getLeaveUtilization(year));
  } catch (err) {
    next(err);
  }
}
async function getPayrollCost(req, res, next) {
  const month = parseInt(req.query.month) || new Date().getMonth() + 1;
  const year = parseInt(req.query.year) || new Date().getFullYear();
  try {
    res.json(await service.getPayrollCost(month, year));
  } catch (err) {
    next(err);
  }
}
async function getAttrition(req, res, next) {
  const months = parseInt(req.query.months) || 3;
  try {
    res.json(await service.getAttrition(months));
  } catch (err) {
    next(err);
  }
}
async function getOnboardingStatus(req, res, next) {
  try {
    res.json(await service.getOnboardingStatus());
  } catch (err) {
    next(err);
  }
}
async function getSalaryMetrics(req, res, next) {
  try {
    res.json(await service.getSalaryMetrics());
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getHeadcount,
  getAttendanceSummary,
  getLeaveUtilization,
  getPayrollCost,
  getAttrition,
  getOnboardingStatus,
  getSalaryMetrics,
};
