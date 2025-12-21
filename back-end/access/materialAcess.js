// access/materialAcess.js
// Service/Access layer cho module quản lý vật tư

const { getPool, sql } = require("../config/db");
const { sendNotificationToMany } = require("../access/notificationAccess");

module.exports = {
  async addNewMaterial({ materialName, unit, unitPrice }) {
    const pool = await getPool();

    // ===== Normalize =====
    const name = String(materialName || "").trim();
    const u = String(unit || "").trim();
    const price = Number(unitPrice);

    // ===== Validate =====
    if (!name || name.length < 2 || name.length > 100) {
      throw new Error("Tên vật tư phải từ 2–100 ký tự");
    }

    if (!u || u.length < 1 || u.length > 50) {
      throw new Error("Đơn vị phải từ 1–50 ký tự");
    }

    if (!Number.isFinite(price) || price < 0) {
      throw new Error("Giá tiền phải là số >= 0");
    }

    // ===== Check trùng tên + đơn vị =====
    const dup = await pool
      .request()
      .input("materialName", sql.NVarChar(100), name)
      .input("unit", sql.NVarChar(50), u).query(`
      SELECT 1
      FROM Materials
      WHERE materialName = @materialName
        AND unit = @unit
    `);

    if (dup.recordset.length) {
      throw new Error("Vật tư trùng tên và đơn vị đã tồn tại");
    }

    // ===== Insert =====
    await pool
      .request()
      .input("materialName", sql.NVarChar(100), name)
      .input("unit", sql.NVarChar(50), u)
      .input("unitPrice", sql.Decimal(18, 2), price).query(`
      INSERT INTO Materials (
        materialName,
        unit,
        unitPrice,
        stockQuantity,
        createdAt,
        updatedAt
      )
      VALUES (
        @materialName,
        @unit,
        @unitPrice,
        0,
        GETDATE(),
        GETDATE()
      )
    `);

    return { message: "Thêm vật tư mới thành công!" };
  },

  async getAllMaterials() {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        materialId,
        materialName,
        unit,
        unitPrice,
        stockQuantity,
        createdAt,
        updatedAt
      FROM Materials
      ORDER BY materialId DESC
    `);
    return result.recordset;
  },

  async getAllTransactions() {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        mt.transactionId,
        mt.transactionType,
        mt.quantity,
        mt.unitPriceAtTime,
        mt.transactionDate,
        mt.note,
        mt.appointmentId,
        m.materialId,
        m.materialName,
        u.userId AS operatorId,
        u.fullName AS operatorName
      FROM MaterialTransactions mt
      JOIN Materials m ON mt.materialId = m.materialId
      JOIN Users u ON mt.userId = u.userId
      ORDER BY mt.transactionDate DESC
    `);
    return result.recordset;
  },

  /**
   * ✅ CHECK QUYỀN: Y tá có được thao tác vật tư cho appointmentId này không?
   * Điều kiện:
   * - NurseShifts.nurseId = @nurseId
   * - NurseShifts.status = 'Assigned'
   * - appointment thuộc scheduleId đó thông qua Slots
   */
  async nurseHasAccessToAppointment(nurseId, appointmentId) {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("nurseId", sql.Int, nurseId)
      .input("appointmentId", sql.Int, appointmentId).query(`
        SELECT TOP 1 1 AS ok
        FROM NurseShifts ns
        JOIN Schedules sch ON ns.scheduleId = sch.scheduleId
        JOIN Slots sl ON sl.scheduleId = sch.scheduleId
        JOIN Appointments a ON a.slotId = sl.slotId
        WHERE ns.nurseId = @nurseId
          AND ns.status = 'Assigned'
          AND a.appointmentId = @appointmentId
      `);

    return result.recordset.length > 0;
  },

  async addTransaction({
    materialId,
    userId,
    appointmentId = null,
    transactionType,
    quantity,
    note = null,
  }) {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      /* ===============================
       1. Lấy tồn kho + GIÁ HIỆN TẠI
    =============================== */
      const stockReq = new sql.Request(transaction);
      stockReq.input("materialId", sql.Int, materialId);

      const stockResult = await stockReq.query(`
      SELECT stockQuantity, unitPrice
      FROM Materials
      WHERE materialId = @materialId
    `);

      if (!stockResult.recordset.length) {
        throw new Error("Không tìm thấy vật tư");
      }

      const currentStock = Number(stockResult.recordset[0].stockQuantity);
      const unitPriceAtTime = Number(stockResult.recordset[0].unitPrice);
      const qty = Number(quantity);

      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error("Số lượng phải là số > 0");
      }

      // Validate tồn kho cho các giao dịch trừ kho
      if (
        (transactionType === "USE" || transactionType === "DAMAGED") &&
        currentStock < qty
      ) {
        throw new Error(`Không đủ tồn kho (còn ${currentStock}, cần ${qty})`);
      }

      /* ===============================
       2. INSERT TRANSACTION (CHỐT GIÁ)
    =============================== */
      const insertReq = new sql.Request(transaction);
      insertReq
        .input("materialId", sql.Int, materialId)
        .input("userId", sql.Int, userId)
        .input("appointmentId", sql.Int, appointmentId)
        .input("transactionType", sql.NVarChar(20), transactionType)
        .input("quantity", sql.Decimal(18, 2), qty)
        .input("unitPriceAtTime", sql.Decimal(18, 2), unitPriceAtTime)
        .input("note", sql.NVarChar(255), note);

      await insertReq.query(`
      INSERT INTO MaterialTransactions (
        materialId,
        userId,
        transactionType,
        quantity,
        unitPriceAtTime,
        transactionDate,
        note,
        appointmentId
      )
      VALUES (
        @materialId,
        @userId,
        @transactionType,
        @quantity,
        @unitPriceAtTime,
        GETDATE(),
        @note,
        @appointmentId
      )
    `);

      /* ===============================
       3. UPDATE TỒN KHO
    =============================== */
      let newStock = currentStock;

      if (transactionType === "IMPORT" || transactionType === "RETURN") {
        newStock += qty;
      } else if (transactionType === "USE" || transactionType === "DAMAGED") {
        newStock -= qty;
      }

      const updateReq = new sql.Request(transaction);
      updateReq
        .input("materialId", sql.Int, materialId)
        .input("newStock", sql.Decimal(18, 2), newStock);

      await updateReq.query(`
      UPDATE Materials
      SET stockQuantity = @newStock,
          updatedAt = GETDATE()
      WHERE materialId = @materialId
    `);

      /* ===============================
       4. CẢNH BÁO TỒN KHO THẤP
    =============================== */
      await notifyLowStock(materialId, newStock, transaction);

      await transaction.commit();

      return {
        message: `Transaction ${transactionType} thành công`,
        updatedStock: newStock,
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async addUsedMaterial({
    diagnosisServiceId = null,
    appointmentId = null,
    materialId,
    quantityUsed,
    note = null,
  }) {
    const pool = await getPool();

    // Nếu chưa có diagnosisServiceId nhưng có appointmentId -> tìm diagnosisId -> diagnosisServiceId
    if (!diagnosisServiceId && appointmentId) {
      const diagRes = await pool
        .request()
        .input("appointmentId", sql.Int, appointmentId).query(`
          SELECT TOP 1 diagnosisId
          FROM Diagnoses
          WHERE appointmentId = @appointmentId
          ORDER BY createdAt DESC
        `);
      if (!diagRes.recordset || diagRes.recordset.length === 0) {
        throw new Error("Không tìm thấy diagnosis cho appointmentId này.");
      }
      const diagnosisId = diagRes.recordset[0].diagnosisId;

      const dsRes = await pool
        .request()
        .input("diagnosisId", sql.Int, diagnosisId).query(`
          SELECT TOP 1 diagnosisServiceId
          FROM DiagnosisServices
          WHERE diagnosisId = @diagnosisId
          ORDER BY createdAt DESC
        `);
      if (!dsRes.recordset || dsRes.recordset.length === 0) {
        throw new Error(
          "Không tìm thấy DiagnosisService tương ứng cho appointment này."
        );
      }
      diagnosisServiceId = dsRes.recordset[0].diagnosisServiceId;
    }

    if (!diagnosisServiceId) {
      throw new Error(
        "Cần cung cấp diagnosisServiceId hoặc appointmentId có diagnosis tương ứng."
      );
    }

    await pool
      .request()
      .input("diagnosisServiceId", sql.Int, diagnosisServiceId)
      .input("materialId", sql.Int, materialId)
      .input("usedQuantity", sql.Decimal(18, 2), quantityUsed)
      .input("note", sql.NVarChar(255), note).query(`
        INSERT INTO UsedMaterials (diagnosisServiceId, materialId, usedQuantity, note, createdAt)
        VALUES (@diagnosisServiceId, @materialId, @usedQuantity, @note, GETDATE())
      `);

    return { message: "Đã ghi nhận vật tư sử dụng thực tế" };
  },

  /**
   * ✅ Nurse: chỉ lấy các appointment hôm nay thuộc ca trực của nurse
   */
  async getTodayAppointments(nurseId) {
    const pool = await getPool();
    const result = await pool.request().input("nurseId", sql.Int, nurseId)
      .query(`
        SELECT
          a.appointmentId,
          uPatient.userId AS patientId,
          uPatient.fullName AS patientName,
          uDoc.userId AS doctorId,
          uDoc.fullName AS doctorName,
          sch.workDate,
          CONVERT(VARCHAR(5), sl.startTime, 108) AS startTime,
          CONVERT(VARCHAR(5), sl.endTime, 108) AS endTime,
          STRING_AGG(srv.serviceName, ', ') WITHIN GROUP (ORDER BY srv.serviceName) AS serviceNames,
          MIN(ds.serviceId) AS serviceId,
          a.status
        FROM NurseShifts ns
        JOIN Schedules sch ON ns.scheduleId = sch.scheduleId
        JOIN Slots sl ON sl.scheduleId = sch.scheduleId
        JOIN Appointments a ON a.slotId = sl.slotId
        LEFT JOIN Users uPatient ON a.patientId = uPatient.userId
        LEFT JOIN Users uDoc ON a.doctorId = uDoc.userId
        LEFT JOIN Diagnoses d ON d.appointmentId = a.appointmentId
        LEFT JOIN DiagnosisServices ds ON ds.diagnosisId = d.diagnosisId
        LEFT JOIN Services srv ON srv.serviceId = ds.serviceId
        WHERE ns.nurseId = @nurseId
          AND ns.status = 'Assigned'
          AND sch.workDate = CAST(GETDATE() AS DATE)
          AND a.status IN ('DiagnosisCompleted')
        GROUP BY
          a.appointmentId,
          uPatient.userId,
          uPatient.fullName,
          uDoc.userId,
          uDoc.fullName,
          sch.workDate,
          sl.startTime,
          sl.endTime,
          a.status
        ORDER BY sl.startTime;
      `);

    return result.recordset;
  },

  async addUsedFinalTransaction({
    appointmentId,
    materialId,
    quantityUsed,
    note = null,
    userId,
  }) {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // 1. Lấy giá hiện tại của vật tư (CHỐT GIÁ)
      const priceReq = new sql.Request(transaction);
      priceReq.input("materialId", sql.Int, materialId);

      const priceRes = await priceReq.query(`
      SELECT unitPrice
      FROM Materials
      WHERE materialId = @materialId
    `);

      if (!priceRes.recordset.length) {
        throw new Error("Không tìm thấy vật tư để ghi nhận đã dùng");
      }

      const unitPriceAtTime = Number(priceRes.recordset[0].unitPrice);
      const qty = Number(quantityUsed);

      if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error("Số lượng sử dụng phải > 0");
      }

      // 2. Insert TRANSACTION USED_FINAL (CHỈ TÍNH TIỀN)
      const insertReq = new sql.Request(transaction);
      insertReq
        .input("materialId", sql.Int, materialId)
        .input("userId", sql.Int, userId)
        .input("appointmentId", sql.Int, appointmentId)
        .input("transactionType", sql.NVarChar(20), "USED_FINAL")
        .input("quantity", sql.Decimal(18, 2), qty)
        .input("unitPriceAtTime", sql.Decimal(18, 2), unitPriceAtTime)
        .input("note", sql.NVarChar(255), note);

      await insertReq.query(`
      INSERT INTO MaterialTransactions (
        materialId,
        userId,
        appointmentId,
        transactionType,
        quantity,
        unitPriceAtTime,
        transactionDate,
        note
      )
      VALUES (
        @materialId,
        @userId,
        @appointmentId,
        @transactionType,
        @quantity,
        @unitPriceAtTime,
        GETDATE(),
        @note
      )
    `);

      await transaction.commit();

      return {
        message: "Đã ghi nhận vật tư dùng thực tế (đã chốt chi phí)",
        unitPriceAtTime,
        quantityUsed: qty,
        totalAmount: qty * unitPriceAtTime,
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async getMaterialsByService(serviceId) {
    const pool = await getPool();
    const result = await pool.request().input("serviceId", sql.Int, serviceId)
      .query(`
        SELECT
          sm.id,
          sm.serviceId,
          sm.materialId,
          m.materialName,
          m.unit,
          sm.standardQuantity
        FROM ServiceMaterials sm
        JOIN Materials m ON sm.materialId = m.materialId
        WHERE sm.serviceId = @serviceId
      `);
    return result.recordset;
  },

  async getMaterialsByAppointment(appointmentId) {
    const pool = await getPool();

    // 1) diagnosisId
    const diagRes = await pool
      .request()
      .input("appointmentId", sql.Int, appointmentId).query(`
        SELECT diagnosisId
        FROM Diagnoses
        WHERE appointmentId = @appointmentId
      `);

    if (!diagRes.recordset.length) return [];

    const diagnosisId = diagRes.recordset[0].diagnosisId;

    // 2) serviceIds
    const dsRes = await pool
      .request()
      .input("diagnosisId", sql.Int, diagnosisId).query(`
        SELECT serviceId
        FROM DiagnosisServices
        WHERE diagnosisId = @diagnosisId
      `);

    if (!dsRes.recordset.length) return [];

    const serviceIds = dsRes.recordset.map((s) => s.serviceId);

    // 3) lấy vật tư của các service
    const smRes = await pool.request().query(`
      SELECT 
        sm.serviceId,
        sm.materialId,
        m.materialName,
        m.unit,
        sm.standardQuantity
      FROM ServiceMaterials sm
      JOIN Materials m ON sm.materialId = m.materialId
      WHERE sm.serviceId IN (${serviceIds.join(",")})
      ORDER BY sm.materialId
    `);

    // 4) gộp vật tư trùng
    const map = {};
    smRes.recordset.forEach((r) => {
      if (!map[r.materialId]) {
        map[r.materialId] = {
          materialId: r.materialId,
          materialName: r.materialName,
          unit: r.unit,
          standardQuantity: r.standardQuantity,
          serviceIds: [r.serviceId],
        };
      } else {
        map[r.materialId].standardQuantity += r.standardQuantity;
        map[r.materialId].serviceIds.push(r.serviceId);
      }
    });

    return Object.values(map);
  },

  async getMaterialUsageReport() {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        srv.serviceName,
        m.materialName,
        sm.standardQuantity AS Standard,
        um.usedQuantity AS Actual,
        (um.usedQuantity - sm.standardQuantity) AS Difference,
        ds.diagnosisServiceId,
        um.id AS usedRecordId
      FROM UsedMaterials um
      JOIN DiagnosisServices ds ON um.diagnosisServiceId = ds.diagnosisServiceId
      JOIN Services srv ON ds.serviceId = srv.serviceId
      JOIN Materials m ON um.materialId = m.materialId
      LEFT JOIN ServiceMaterials sm ON sm.serviceId = srv.serviceId AND sm.materialId = um.materialId
      ORDER BY srv.serviceName, m.materialName
    `);
    return result.recordset;
  },

  async updateMaterialInfo(materialId, { materialName, unit, unitPrice }) {
    const pool = await getPool();

    const name = String(materialName || "").trim();
    const u = String(unit || "").trim();
    const price = Number(unitPrice);

    if (!Number.isInteger(materialId) || materialId <= 0)
      throw new Error("materialId không hợp lệ");

    if (!name || name.length < 2 || name.length > 100)
      throw new Error("Tên vật tư phải 2–100 ký tự");

    if (!u || u.length < 1 || u.length > 50)
      throw new Error("Đơn vị phải 1–50 ký tự");

    if (!Number.isFinite(price) || price < 0)
      throw new Error("Giá phải là số >= 0");

    const dup = await pool
      .request()
      .input("materialId", sql.Int, materialId)
      .input("materialName", sql.NVarChar(100), name)
      .input("unit", sql.NVarChar(50), u).query(`
        SELECT 1
        FROM Materials
        WHERE materialId <> @materialId
          AND materialName = @materialName
          AND unit = @unit
      `);

    if (dup.recordset.length)
      throw new Error("Vật tư trùng tên + đơn vị đã tồn tại");

    const result = await pool
      .request()
      .input("materialId", sql.Int, materialId)
      .input("materialName", sql.NVarChar(100), name)
      .input("unit", sql.NVarChar(50), u)
      .input("unitPrice", sql.Decimal(18, 2), price).query(`
        UPDATE Materials
        SET
          materialName = @materialName,
          unit = @unit,
          unitPrice = @unitPrice,
          updatedAt = GETDATE()
        WHERE materialId = @materialId
      `);

    if (result.rowsAffected[0] === 0) throw new Error("Không tìm thấy vật tư");

    return { message: "Cập nhật vật tư thành công!" };
  },

  async updateServiceMaterial(serviceId, materialId, standardQuantity) {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("serviceId", sql.Int, serviceId)
      .input("materialId", sql.Int, materialId)
      .input("standardQuantity", sql.Decimal(18, 2), standardQuantity).query(`
        UPDATE ServiceMaterials
        SET standardQuantity = @standardQuantity
        WHERE serviceId = @serviceId AND materialId = @materialId
      `);

    if (result.rowsAffected[0] === 0) {
      throw new Error("Không tìm thấy định mức vật tư để cập nhật");
    }

    return { message: "Cập nhật định mức thành công!" };
  },

  async addMaterialToService(serviceId, materialId, standardQuantity) {
    const pool = await getPool();

    const exists = await pool
      .request()
      .input("serviceId", sql.Int, serviceId)
      .input("materialId", sql.Int, materialId).query(`
        SELECT 1 FROM ServiceMaterials
        WHERE serviceId = @serviceId AND materialId = @materialId
      `);

    if (exists.recordset.length > 0) {
      throw new Error("Vật tư này đã có trong dịch vụ");
    }

    await pool
      .request()
      .input("serviceId", sql.Int, serviceId)
      .input("materialId", sql.Int, materialId)
      .input("standardQuantity", sql.Decimal(18, 2), standardQuantity).query(`
        INSERT INTO ServiceMaterials (serviceId, materialId, standardQuantity)
        VALUES (@serviceId, @materialId, @standardQuantity)
      `);

    return { message: "Thêm vật tư vào dịch vụ thành công!" };
  },

  async removeMaterialFromService(serviceId, materialId) {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("serviceId", sql.Int, serviceId)
      .input("materialId", sql.Int, materialId).query(`
        DELETE FROM ServiceMaterials
        WHERE serviceId = @serviceId AND materialId = @materialId
      `);

    if (result.rowsAffected[0] === 0) {
      throw new Error("Không tìm thấy định mức để xóa");
    }

    return { message: "Xóa vật tư khỏi dịch vụ thành công!" };
  },

  async getAllServices() {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT serviceId, serviceName
      FROM Services
      ORDER BY serviceName
    `);
    return result.recordset;
  },

  async getAllServiceMaterials() {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        sm.id,
        sm.serviceId,
        sm.materialId,
        sm.standardQuantity,
        m.materialName,
        m.unit
      FROM ServiceMaterials sm
      JOIN Materials m ON sm.materialId = m.materialId
      ORDER BY sm.serviceId, m.materialName
    `);
    return result.recordset;
  },
};

async function notifyLowStock(materialId, newStock, transaction) {
  if (newStock >= 10) return;

  const req = new sql.Request(transaction);
  const matRes = await req.input("materialId", sql.Int, materialId).query(`
      SELECT materialName
      FROM Materials
      WHERE materialId = @materialId
    `);

  if (!matRes.recordset.length) return;

  const materialName = matRes.recordset[0].materialName;

  const adminRes = await req.query(`
    SELECT u.userId
    FROM Users u
    JOIN Roles r ON u.roleId = r.roleId
    WHERE r.roleName = 'ClinicManager'
  `);

  const notifications = adminRes.recordset.map((a) => ({
    receiverId: a.userId,
    senderId: null,
    title: "⚠️ Cảnh báo tồn kho",
    message: `Vật tư "${materialName}" sắp hết (còn ${newStock})`,
    type: "LOW_STOCK",
  }));

  await sendNotificationToMany(notifications);
}

async function getMaterialSummaryReport(month) {
  const pool = await getPool();

  const query = `
DECLARE @month NVARCHAR(7) = @monthParam; -- 'YYYY-MM' hoặc NULL
DECLARE @startDate DATETIME = NULL;
DECLARE @endDate DATETIME = NULL;

IF @month IS NOT NULL
BEGIN
    SET @startDate = CAST(DATEFROMPARTS(LEFT(@month,4), RIGHT(@month,2), 1) AS DATETIME);
    SET @endDate = DATEADD(MONTH, 1, @startDate);
END;

-- USED
SELECT
    'USED' AS category,
    SUM(mt.quantity) AS totalQuantity,
    SUM(mt.quantity * mt.unitPriceAtTime) AS totalAmount
FROM MaterialTransactions mt
JOIN Materials m ON mt.materialId = m.materialId
WHERE mt.transactionType IN ('USE','DAMAGED')
  AND (
        @startDate IS NULL
        OR (mt.transactionDate >= @startDate AND mt.transactionDate < @endDate)
      )

UNION ALL

-- IMPORT
SELECT
    'IMPORT',
    SUM(mt.quantity),
    SUM(mt.quantity * mt.unitPriceAtTime)
FROM MaterialTransactions mt
JOIN Materials m ON mt.materialId = m.materialId
WHERE mt.transactionType = 'IMPORT'
  AND (
        @startDate IS NULL
        OR (mt.transactionDate >= @startDate AND mt.transactionDate < @endDate)
      );

`;

  const result = await pool
    .request()
    .input("monthParam", sql.NVarChar(7), month || null)
    .query(query);

  return result.recordset;
}

async function getMaterialDetailReport(month) {
  const pool = await getPool();

  const query = `
DECLARE @month NVARCHAR(7) = @monthParam;

DECLARE @startMonth DATETIME = NULL;
DECLARE @endMonth DATETIME = NULL;

DECLARE @startWeek DATETIME = DATEADD(DAY, -6, CAST(GETDATE() AS DATETIME));
DECLARE @endWeek DATETIME = DATEADD(DAY, 1, CAST(GETDATE() AS DATETIME));

IF @month IS NOT NULL
BEGIN
    SET @startMonth = CAST(DATEFROMPARTS(LEFT(@month,4), RIGHT(@month,2), 1) AS DATETIME);
    SET @endMonth = DATEADD(MONTH, 1, @startMonth);
END;

-- WEEK
SELECT
    mt.transactionType,
    m.materialId,
    m.materialName,
    m.unit,
    SUM(mt.quantity) AS totalQuantity,
    SUM(mt.quantity * mt.unitPriceAtTime) AS totalAmount,
    'WEEK' AS period
FROM MaterialTransactions mt
JOIN Materials m ON mt.materialId = m.materialId
WHERE mt.transactionType IN ('USE','DAMAGED','IMPORT')
  AND mt.transactionDate >= @startWeek
  AND mt.transactionDate < @endWeek
GROUP BY mt.transactionType, m.materialId, m.materialName, m.unit

UNION ALL

-- MONTH
SELECT
    mt.transactionType,
    m.materialId,
    m.materialName,
    m.unit,
    SUM(mt.quantity),
    SUM(mt.quantity * mt.unitPriceAtTime),
    'MONTH'
FROM MaterialTransactions mt
JOIN Materials m ON mt.materialId = m.materialId
WHERE mt.transactionType IN ('USE','DAMAGED','IMPORT')
  AND (
        @startMonth IS NULL
        OR (mt.transactionDate >= @startMonth AND mt.transactionDate < @endMonth)
      )
GROUP BY mt.transactionType, m.materialId, m.materialName, m.unit
ORDER BY materialName, transactionType, period;

`;

  const result = await pool
    .request()
    .input("monthParam", sql.NVarChar(7), month || null)
    .query(query);

  return result.recordset;
}

module.exports = {
  ...module.exports,
  getMaterialSummaryReport,
  getMaterialDetailReport,
};
