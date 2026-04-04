const service = require("./department.service");
async function list(req, res, next) {
  try {
    res.json(await service.list());
  } catch (err) {
    next(err);
  }
}
async function create(req, res, next) {
  try {
    res.status(201).json(await service.create(req.body));
  } catch (err) {
    next(err);
  }
}
async function update(req, res, next) {
  try {
    res.json(await service.update(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}
module.exports = { list, create, update };
