const service = require("./payroll.service");

async function getSalaryStructures(req, res, next) {
  try {
    res.json(await service.getSalaryStructures(req.params.employeeId));
  } catch (err) { next(err); }
}

async function createSalaryStructure(req, res, next) {
  try {
    res.status(201).json(await service.createSalaryStructure(req.body));
  } catch (err) { next(err); }
}

async function updateSalaryStructure(req, res, next) {
  try {
    res.json(await service.updateSalaryStructure(req.params.id, req.body));
  } catch (err) { next(err); }
}

async function listPayrollRuns(req, res, next) {
  try {
    res.json(await service.listPayrollRuns());
  } catch (err) { next(err); }
}

async function createPayrollRun(req, res, next) {
  try {
    const { month, year } = req.body;
    res.status(201).json(
      await service.createPayrollRun(
        { month: Number(month), year: Number(year) },
        req.user.id
      )
    );
  } catch (err) { next(err); }
}

async function getPayrollRun(req, res, next) {
  try {
    res.json(await service.getPayrollRun(req.params.id));
  } catch (err) { next(err); }
}

async function finalizePayrollRun(req, res, next) {
  try {
    res.json(await service.finalizePayrollRun(req.params.id));
  } catch (err) { next(err); }
}

async function getMyPayslips(req, res, next) {
  try {
    res.json(await service.getMyPayslips(req.user.id));
  } catch (err) { next(err); }
}

module.exports = {
  getSalaryStructures,
  createSalaryStructure,
  updateSalaryStructure,
  listPayrollRuns,
  createPayrollRun,
  getPayrollRun,
  finalizePayrollRun,
  getMyPayslips,
};
