// controllers/materialController.js

const materialService = require("../access/materialAcess");

// ===== ClinicManager =====
exports.updateServiceMaterial = async (req, res) => {
  try {
    const { serviceId, materialId } = req.params;
    const { standardQuantity } = req.body;

    if (standardQuantity == null || standardQuantity < 0) {
      return res
        .status(400)
        .json({ error: "standardQuantity là bắt buộc và phải >= 0" });
    }

    const result = await materialService.updateServiceMaterial(
      parseInt(serviceId, 10),
      parseInt(materialId, 10),
      parseFloat(standardQuantity)
    );

    res.json(result);
  } catch (err) {
    console.error("updateServiceMaterial error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.addMaterialToService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { materialId, standardQuantity } = req.body;

    if (!materialId || standardQuantity == null || standardQuantity < 0) {
      return res
        .status(400)
        .json({ error: "materialId và standardQuantity là bắt buộc" });
    }

    const result = await materialService.addMaterialToService(
      parseInt(serviceId, 10),
      parseInt(materialId, 10),
      parseFloat(standardQuantity)
    );

    res.json(result);
  } catch (err) {
    console.error("addMaterialToService error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.removeMaterialFromService = async (req, res) => {
  try {
    const { serviceId, materialId } = req.params;

    const result = await materialService.removeMaterialFromService(
      parseInt(serviceId, 10),
      parseInt(materialId, 10)
    );

    res.json(result);
  } catch (err) {
    console.error("removeMaterialFromService error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getAllServices = async (req, res) => {
  try {
    const data = await materialService.getAllServices();
    res.json(data);
  } catch (err) {
    console.error("getAllServices error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getAllServiceMaterials = async (req, res) => {
  try {
    const data = await materialService.getAllServiceMaterials();
    res.json(data);
  } catch (err) {
    console.error("getAllServiceMaterials error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ===== Admin =====
exports.getAllMaterials = async (req, res) => {
  try {
    const data = await materialService.getAllMaterials();
    res.json(data);
  } catch (err) {
    console.error("getAllMaterials error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getAllTransactions = async (req, res) => {
  try {
    const data = await materialService.getAllTransactions();
    res.json(data);
  } catch (err) {
    console.error("getAllTransactions error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.importMaterial = async (req, res) => {
  try {
    // ✅ Không tin userId từ body nếu bạn muốn chặt hơn:
    // const userId = req.user?.userId;
    // Nhưng mình giữ theo flow hiện tại của bạn:
    const { materialId, userId, quantity, note = null } = req.body;

    if (!materialId || !userId || quantity == null) {
      return res
        .status(400)
        .json({ error: "materialId, userId và quantity là bắt buộc." });
    }

    if (quantity <= 0) {
      return res
        .status(400)
        .json({ error: "Số lượng nhập kho phải lớn hơn 0." });
    }
    const result = await materialService.addTransaction({
      materialId,
      userId,
      transactionType: "IMPORT",
      quantity,
      note,
    });

    res.json(result);
  } catch (err) {
    console.error("importMaterial error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.addNewMaterial = async (req, res) => {
  try {
    const { materialName, unit, unitPrice } = req.body;

    if (!materialName || !unit || unitPrice == null) {
      return res.status(400).json({ error: "Thiếu thông tin vật tư." });
    }

    if (unitPrice < 0) {
      return res.status(400).json({ error: "Giá vật tư không được là số âm." });
    }

    const result = await materialService.addNewMaterial({
      materialName,
      unit,
      unitPrice,
    });

    res.json(result);
  } catch (err) {
    console.error("addNewMaterial error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ===== Nurse (ĐÃ KHÓA QUYỀN) =====

exports.getTodayAppointments = async (req, res) => {
  try {
    const nurseId = req.user?.userId;
    if (!nurseId) return res.status(401).json({ error: "Vui lòng đăng nhập." });

    const data = await materialService.getTodayAppointments(nurseId);
    res.json(data);
  } catch (err) {
    console.error("getTodayAppointments error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getMaterialsByService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    if (!serviceId)
      return res.status(400).json({ error: "serviceId required" });

    const data = await materialService.getMaterialsByService(
      parseInt(serviceId, 10)
    );
    res.json(data);
  } catch (err) {
    console.error("getMaterialsByService error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getMaterialsByAppointment = async (req, res) => {
  try {
    const nurseId = req.user?.userId;
    if (!nurseId) return res.status(401).json({ error: "Vui lòng đăng nhập." });

    const { appointmentId } = req.params;
    if (!appointmentId)
      return res.status(400).json({ error: "appointmentId required" });

    const apptId = parseInt(appointmentId, 10);

    // ✅ CHECK QUYỀN
    const allowed = await materialService.nurseHasAccessToAppointment(
      nurseId,
      apptId
    );
    if (!allowed) {
      return res
        .status(403)
        .json({ error: "Bạn không được phép xem vật tư của ca khám này." });
    }

    const data = await materialService.getMaterialsByAppointment(apptId);
    res.json(data);
  } catch (err) {
    console.error("getMaterialsByAppointment error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.useMaterial = async (req, res) => {
  try {
    const nurseId = req.user?.userId;
    if (!nurseId) return res.status(401).json({ error: "Vui lòng đăng nhập." });

    const {
      materialId,
      appointmentId = null,
      quantity,
      note = null,
    } = req.body;

    if (!materialId || quantity == null) {
      return res
        .status(400)
        .json({ error: "materialId và quantity là bắt buộc." });
    }

    if (appointmentId != null) {
      const allowed = await materialService.nurseHasAccessToAppointment(
        nurseId,
        parseInt(appointmentId, 10)
      );
      if (!allowed) {
        return res
          .status(403)
          .json({ error: "Bạn không được phép lấy vật tư cho ca khám này." });
      }
    }

    const result = await materialService.addTransaction({
      materialId,
      userId: nurseId, // ✅ LẤY TỪ TOKEN
      appointmentId,
      transactionType: "USE",
      quantity,
      note,
    });

    res.json(result);
  } catch (err) {
    console.error("useMaterial error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.returnMaterial = async (req, res) => {
  try {
    const nurseId = req.user?.userId;
    if (!nurseId) return res.status(401).json({ error: "Vui lòng đăng nhập." });

    const {
      materialId,
      appointmentId = null,
      quantity,
      note = null,
    } = req.body;

    if (!materialId || quantity == null) {
      return res
        .status(400)
        .json({ error: "materialId và quantity là bắt buộc." });
    }

    if (appointmentId != null) {
      const allowed = await materialService.nurseHasAccessToAppointment(
        nurseId,
        parseInt(appointmentId, 10)
      );
      if (!allowed) {
        return res
          .status(403)
          .json({ error: "Bạn không được phép hoàn vật tư cho ca khám này." });
      }
    }

    const result = await materialService.addTransaction({
      materialId,
      userId: nurseId, // ✅ LẤY TỪ TOKEN
      appointmentId,
      transactionType: "RETURN",
      quantity,
      note,
    });

    res.json(result);
  } catch (err) {
    console.error("returnMaterial error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.addUsedMaterial = async (req, res) => {
  try {
    const nurseId = req.user?.userId;
    if (!nurseId) return res.status(401).json({ error: "Vui lòng đăng nhập." });

    const {
      diagnosisServiceId = null,
      appointmentId = null,
      materialId,
      quantityUsed,
      note = null,
    } = req.body;

    if (!materialId || quantityUsed == null) {
      return res
        .status(400)
        .json({ error: "materialId và quantityUsed là bắt buộc." });
    }

    // ✅ Nếu nurse gửi appointmentId thì check quyền trước
    if (appointmentId != null) {
      const allowed = await materialService.nurseHasAccessToAppointment(
        nurseId,
        parseInt(appointmentId, 10)
      );
      if (!allowed) {
        return res
          .status(403)
          .json({ error: "Bạn không được phép ghi vật tư cho ca khám này." });
      }
    }

    const result = await materialService.addUsedMaterial({
      diagnosisServiceId,
      appointmentId,
      materialId,
      quantityUsed,
      note,
    });

    res.json(result);
  } catch (err) {
    console.error("addUsedMaterial error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ===== Admin report =====
exports.getMaterialUsageReport = async (req, res) => {
  try {
    const data = await materialService.getMaterialUsageReport();
    res.json(data);
  } catch (err) {
    console.error("getMaterialUsageReport error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getMaterialSummaryReport = async (req, res) => {
  try {
    const month = req.query.month || null;
    const rows = await materialService.getMaterialSummaryReport(month);

    const report = {
      used: {
        week: { quantity: 0, amount: 0 },
        month: { quantity: 0, amount: 0 },
      },
      import: {
        week: { quantity: 0, amount: 0 },
        month: { quantity: 0, amount: 0 },
      },
    };

    rows.forEach((r) => {
      const qty = r.totalQuantity || 0;
      const amt = r.totalAmount || 0;

      if (r.category === "USED") {
        report.used.month = { quantity: qty, amount: amt };
      }
      if (r.category === "IMPORT") {
        report.import.month = { quantity: qty, amount: amt };
      }
    });

    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Không thể lấy báo cáo vật tư" });
  }
};

exports.getMaterialDetailReport = async (req, res) => {
  try {
    const month = req.query.month?.trim() || null;
    const rows = await materialService.getMaterialDetailReport(month);

    const report = {
      used: { week: [], month: [] },
      import: { week: [], month: [] },
    };

    rows.forEach((r) => {
      if (!r.period) return;

      const item = {
        materialId: r.materialId,
        materialName: r.materialName,
        unit: r.unit,
        quantity: r.totalQuantity || 0,
        amount: r.totalAmount || 0,
      };

      const period = r.period.toLowerCase(); // week | month

      if (r.transactionType === "IMPORT") {
        report.import[period]?.push(item);
      } else {
        report.used[period]?.push(item);
      }
    });

    res.json(report);
  } catch (err) {
    console.error("getMaterialDetailReport error:", err);
    res.status(500).json({ error: "Không thể lấy báo cáo chi tiết vật tư" });
  }
};
