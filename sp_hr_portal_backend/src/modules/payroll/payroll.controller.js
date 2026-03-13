const service = require("./payroll.service");

async function getSalaryStructures(req, res, next) {
  try {
    res.json(await service.getSalaryStructures(req.params.employeeId));
  } catch (err) {
    next(err);
  }
}

async function createSalaryStructure(req, res, next) {
  try {
    res.status(201).json(await service.createSalaryStructure(req.body));
  } catch (err) {
    next(err);
  }
}

async function updateSalaryStructure(req, res, next) {
  try {
    res.json(await service.updateSalaryStructure(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function listPayrollRuns(req, res, next) {
  try {
    res.json(await service.listPayrollRuns());
  } catch (err) {
    next(err);
  }
}

async function createPayrollRun(req, res, next) {
  try {
    const { month, year } = req.body;
    if (!month || !year) {
      return res.status(400).json({ error: "month and year are required" });
    }
    const m = Number(month);
    const y = Number(year);
    if (!Number.isInteger(m) || m < 1 || m > 12) {
      return res.status(400).json({ error: "month must be an integer between 1 and 12" });
    }
    if (!Number.isInteger(y) || y < 2000 || y > 2100) {
      return res.status(400).json({ error: "year must be an integer between 2000 and 2100" });
    }
    res.status(201).json(
      await service.createPayrollRun(
        { month: m, year: y },
        req.user.id
      )
    );
  } catch (err) {
    next(err);
  }
}

async function getPayrollRun(req, res, next) {
  try {
    res.json(await service.getPayrollRun(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function finalizePayrollRun(req, res, next) {
  try {
    res.json(await service.finalizePayrollRun(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function getMyPayslips(req, res, next) {
  try {
    res.json(await service.getMyPayslips(req.user.id));
  } catch (err) {
    next(err);
  }
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
