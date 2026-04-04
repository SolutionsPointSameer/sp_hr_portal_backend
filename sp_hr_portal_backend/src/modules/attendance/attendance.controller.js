const service = require("./attendance.service");
async function checkIn(req, res, next) {
  try {
    const { latitude, longitude } = req.body || {};
    res.json(await service.checkIn(req.user.id, { latitude, longitude }));
  } catch (err) {
    next(err);
  }
}
async function checkOut(req, res, next) {
  try {
    const { latitude, longitude } = req.body || {};
    res.json(await service.checkOut(req.user.id, { latitude, longitude }));
  } catch (err) {
    next(err);
  }
}
async function getMine(req, res, next) {
  const month = parseInt(req.query.month) || new Date().getMonth() + 1;
  const year = parseInt(req.query.year) || new Date().getFullYear();
  try {
    res.json(await service.getMine(req.user.id, month, year));
  } catch (err) {
    next(err);
  }
}
async function getEmployeeRecords(req, res, next) {
  const month = parseInt(req.query.month) || new Date().getMonth() + 1;
  const year = parseInt(req.query.year) || new Date().getFullYear();
  try {
    res.json(await service.getEmployeeRecords(req.params.id, month, year));
  } catch (err) {
    next(err);
  }
}
async function regularize(req, res, next) {
  try {
    res.json(await service.regularize(req.body));
  } catch (err) {
    next(err);
  }
}
async function getTeamSummary(req, res, next) {
  const month = parseInt(req.query.month) || new Date().getMonth() + 1;
  const year = parseInt(req.query.year) || new Date().getFullYear();
  try {
    res.json(await service.getTeamSummary(req.user.id, month, year));
  } catch (err) {
    next(err);
  }
}
async function getAllAttendance(req, res, next) {
  const month = parseInt(req.query.month) || new Date().getMonth() + 1;
  const year = parseInt(req.query.year) || new Date().getFullYear();
  try {
    res.json(await service.getAllAttendance(month, year));
  } catch (err) {
    next(err);
  }
}
module.exports = {
  checkIn,
  checkOut,
  getMine,
  getEmployeeRecords,
  regularize,
  getTeamSummary,
  getAllAttendance,
};
