const service = require("./holiday.service");

async function list(req, res, next) {
  try {
    const result = await service.listHolidays(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const result = await service.getHolidayById(req.params.id);
    if (!result) return res.status(404).json({ error: "Holiday not found" });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const result = await service.createHoliday(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const result = await service.updateHoliday(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.deleteHoliday(req.params.id);
    res.status(204).end();
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Holiday not found" });
    }
    next(err);
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove
};
