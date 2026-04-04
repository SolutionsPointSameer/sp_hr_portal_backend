const service = require("./users.service");

async function listUsers(req, res, next) {
  try {
    res.json(await service.listUsers());
  } catch (err) {
    next(err);
  }
}

async function updateUserStatus(req, res, next) {
  try {
    const { active } = req.body;
    if (typeof active !== "boolean") {
      return res.status(400).json({ error: "'active' boolean is required" });
    }
    const result = await service.updateUserStatus(
      req.params.id,
      active,
      req.user.id
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const result = await service.resetPassword(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsers,
  updateUserStatus,
  resetPassword,
};
