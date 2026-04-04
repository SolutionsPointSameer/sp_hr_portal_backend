const service = require("./employee.service");

async function list(req, res, next) {
  try {
    const result = await service.listEmployees(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getOrgChart(req, res, next) {
  try {
    const result = await service.getOrgChartData();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const result = await service.getEmployeeById(req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const isSelf = req.user.id === req.params.id;
    const isAuthorized = ["MANAGER", "HR_ADMIN", "SUPER_ADMIN"].includes(
      req.user.role,
    );
    
    if (!isSelf && !isAuthorized) {
      return res.status(403).json({ error: "Forbidden: You do not have access to this profile" });
    }

    const result = await service.getEmployeeById(req.params.id);
    
    // Horizontal Authorization Check for Managers (IDOR Protection)
    if (req.user.role === "MANAGER" && !isSelf && result.managerId !== req.user.id) {
       return res.status(403).json({ error: "Forbidden: You do not manage this employee and cannot view their profile" });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const result = await service.createEmployee(req.body, req.user.id);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const result = await service.updateEmployee(
      req.params.id,
      req.body,
      req.user.id,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.deleteEmployee(req.params.id, req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function completeOnboarding(req, res, next) {
  try {
    const result = await service.completeOnboarding(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function listDocuments(req, res, next) {
  try {
    const result = await service.listDocuments(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getUploadUrl(req, res, next) {
  try {
    const { fileName, contentType } = req.body;
    const result = await service.getUploadUrl(
      req.params.id,
      fileName,
      contentType,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function saveDocumentRecord(req, res, next) {
  try {
    const result = await service.saveDocumentRecord(req.params.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function deleteDocument(req, res, next) {
  try {
    await service.deleteDocument(req.params.docId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function uploadMyDocument(req, res, next) {
  try {
    const { type } = req.body;
    if (!type) {
      return res.status(400).json({ error: "Document type is required" });
    }
    const result = await service.uploadMyDocument(req.user.id, type, req.file);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  getMe,
  getById,
  create,
  update,
  remove,
  completeOnboarding,
  listDocuments,
  getUploadUrl,
  saveDocumentRecord,
  deleteDocument,
  uploadMyDocument,
  getOrgChart,
};
