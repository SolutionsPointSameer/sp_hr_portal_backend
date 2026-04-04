const service = require("./settings.service");

async function getSettings(req, res, next) {
  try {
    res.json(await service.getSettings());
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    res.json(await service.updateSettings(req.body));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSettings,
  updateSettings,
};
