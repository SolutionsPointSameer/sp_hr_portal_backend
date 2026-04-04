const service = require("./location.service");

async function listLocations(req, res, next) {
  try {
    const data = await service.listLocations();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function createLocation(req, res, next) {
  try {
    const result = await service.createLocation(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function updateLocation(req, res, next) {
  try {
    const result = await service.updateLocation(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function deleteLocation(req, res, next) {
  try {
    await service.deleteLocation(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listLocations,
  createLocation,
  updateLocation,
  deleteLocation,
};
