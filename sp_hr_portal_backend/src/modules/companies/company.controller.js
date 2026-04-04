const service = require("./company.service");

async function listCompanies(req, res, next) {
  try {
    const data = await service.listCompanies();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function createCompany(req, res, next) {
  try {
    const result = await service.createCompany(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function updateCompany(req, res, next) {
  try {
    const result = await service.updateCompany(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function deleteCompany(req, res, next) {
  try {
    await service.deleteCompany(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
};
