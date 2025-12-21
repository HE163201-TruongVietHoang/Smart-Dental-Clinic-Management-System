const sql = require("mssql");
const { getPool } = require("../config/db");

const {
  createScheduleRequest,
  hasOverlappingSchedule,
  getScheduleRequests,
  getScheduleRequestById,
  approveScheduleRequest,
  rejectScheduleRequest,
  getDoctorSchedules,
  getScheduleDetailByDoctor,
  deleteScheduleByRequestId,
  deleteScheduleRequest,
} = require("../access/scheduleAccess");

const { findAvailableRoom } = require("../access/roomAccess");
const { generateSlots } = require("../access/slotAccess");
const {
  normalizeTime,
  timeToMinutes,
  minutesToHHMMSS,
  formatSqlTime,
  formatDateToYMDUTC,
} = require("../utils/timeUtils");

const {
  getLeastBusyAvailableNurse,
  createNurseShift,
} = require("../access/nurseAccess");
adminApproveRequest;
const { sendNotification } = require("../access/notificationAccess");

function formatTimeHHmm(time) {
  if (!time) return "";

  // SQL Server TIME -> Date (UTC)
  if (time instanceof Date) {
    const h = time.getUTCHours().toString().padStart(2, "0");
    const m = time.getUTCMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  }

  // String "HH:mm:ss"
  if (typeof time === "string") {
    return time.slice(0, 5);
  }

  return "";
}

// ======================================================
// INTERNAL UTILS
// ======================================================
function normalizeTimeToHHMM(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  return `${h.toString().padStart(2, "0")}:${(m || 0)
    .toString()
    .padStart(2, "0")}`;
}

function isOverlap(startA, endA, startB, endB) {
  const base = "2025-01-01";
  const sA = new Date(`${base}T${normalizeTimeToHHMM(startA)}`);
  let eA = new Date(`${base}T${normalizeTimeToHHMM(endA)}`);
  const sB = new Date(`${base}T${normalizeTimeToHHMM(startB)}`);
  let eB = new Date(`${base}T${normalizeTimeToHHMM(endB)}`);

  if (eA <= sA) eA.setDate(eA.getDate() + 1);
  if (eB <= sB) eB.setDate(eB.getDate() + 1);

  return sA < eB && sB < eA;
}

// ======================================================
// CORE: CREATE + HOLD ROOM WITH TRANSACTION
// ======================================================
async function createScheduleWithRoomLock({
  doctorId,
  workDate,
  startTime,
  endTime,
  note,
}) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  const sStart = normalizeTime(startTime);
  const sEnd = normalizeTime(endTime);
  if (!sStart || !sEnd) throw new Error("Invalid time format");

  try {
    await transaction.begin();

    // 1) Create requestId (Request #1)
    const req1 = new sql.Request(transaction);
    const reqResult = await req1
      .input("doctorId", sql.Int, doctorId)
      .input("note", sql.NVarChar, note).query(`
        INSERT INTO ScheduleRequests (doctorId, note, status)
        OUTPUT INSERTED.requestId
        VALUES (@doctorId, @note, 'Pending')
      `);

    const requestId = reqResult.recordset[0].requestId;

    // 2) Find + LOCK room (Request #2)
    const req2 = new sql.Request(transaction);
    const roomResult = await req2
      .input("workDate", sql.Date, workDate)
      .input("startTime", sql.NVarChar, sStart)
      .input("endTime", sql.NVarChar, sEnd).query(`
        WITH NS AS (
          SELECT 
            CAST(@workDate AS DATETIME) + CAST(@startTime AS DATETIME) AS startDT,
            CASE 
              WHEN @endTime < @startTime 
                THEN DATEADD(DAY, 1, CAST(@workDate AS DATETIME) + CAST(@endTime AS DATETIME))
              ELSE CAST(@workDate AS DATETIME) + CAST(@endTime AS DATETIME)
            END AS endDT
        )
        SELECT TOP 1 r.roomId
        FROM Rooms r WITH (UPDLOCK, HOLDLOCK)
        WHERE r.status = 'Available'
          AND NOT EXISTS (
            SELECT 1
            FROM Schedules s WITH (UPDLOCK, HOLDLOCK)
            CROSS APPLY (
              SELECT 
                CAST(s.workDate AS DATETIME) + CAST(s.startTime AS DATETIME) AS startDT,
                CASE 
                  WHEN s.endTime < s.startTime 
                    THEN DATEADD(DAY, 1, CAST(s.workDate AS DATETIME) + CAST(s.endTime AS DATETIME))
                  ELSE CAST(s.workDate AS DATETIME) + CAST(s.endTime AS DATETIME)
                END AS endDT
            ) sc
            CROSS JOIN NS
            WHERE s.roomId = r.roomId
              AND s.status IN ('Pending','Approved')
              AND sc.startDT < NS.endDT
              AND sc.endDT > NS.startDT
          )
        ORDER BY r.roomId
      `);

    if (!roomResult.recordset.length) throw new Error("Không còn phòng trống");
    const roomId = roomResult.recordset[0].roomId;

    // 3) Insert schedule = HOLD room (Request #3)
    const req3 = new sql.Request(transaction);
    await req3
      .input("requestId", sql.Int, requestId)
      .input("doctorId", sql.Int, doctorId)
      .input("roomId", sql.Int, roomId)
      .input("workDate", sql.Date, workDate)
      .input("startTime", sql.NVarChar, sStart)
      .input("endTime", sql.NVarChar, sEnd).query(`
        INSERT INTO Schedules
          (requestId, doctorId, roomId, workDate, startTime, endTime, status)
        VALUES
          (@requestId, @doctorId, @roomId, @workDate,
           CAST(@startTime AS TIME), CAST(@endTime AS TIME), 'Pending')
      `);

    await transaction.commit();
    return { requestId, roomId };
  } catch (err) {
    try {
      await transaction.rollback();
    } catch (_) {}
    throw err;
  }
}

// ======================================================
// PUBLIC SERVICES
// ======================================================
async function createMultipleSchedules(doctorId, note, schedules) {
  const conflicts = [];

  // 1. Internal overlap
  for (let i = 0; i < schedules.length; i++) {
    for (let j = i + 1; j < schedules.length; j++) {
      const A = schedules[i];
      const B = schedules[j];
      if (
        A.workDate === B.workDate &&
        isOverlap(A.startTime, A.endTime, B.startTime, B.endTime)
      ) {
        conflicts.push({
          type: "Internal",
          workDate: A.workDate,
          startTime: A.startTime,
          endTime: A.endTime,
          message: "Các khung giờ bạn chọn bị trùng nhau.",
        });
      }
    }
  }

  // 2. DB overlap (doctor)
  for (const s of schedules) {
    const exists = await hasOverlappingSchedule(
      doctorId,
      s.workDate,
      s.startTime,
      s.endTime
    );
    if (exists) {
      conflicts.push({
        type: "Database",
        workDate: s.workDate,
        startTime: s.startTime,
        endTime: s.endTime,
        message: "Trùng với lịch đã tồn tại.",
      });
    }
  }

  if (conflicts.length > 0) {
    return { requestId: null, conflicts };
  }

  // 3. HOLD ROOM + CREATE
  const results = [];
  for (const s of schedules) {
    const result = await createScheduleWithRoomLock({
      doctorId,
      workDate: s.workDate,
      startTime: s.startTime,
      endTime: s.endTime,
      note,
    });

    results.push({
      workDate: s.workDate,
      startTime: s.startTime,
      endTime: s.endTime,
      roomId: result.roomId,
      status: "Pending",
    });
  }

  return {
    requestId: results[0]?.requestId || null,
    results,
  };
}

// ======================================================
// OTHER FUNCTIONS (GIỮ NGUYÊN HÀNH VI)
// ======================================================
async function checkAvailability(schedules) {
  const results = [];
  for (const s of schedules) {
    const room = await findAvailableRoom(s.workDate, s.startTime, s.endTime);
    results.push({
      ...s,
      available: !!room,
      room,
    });
  }
  return results;
}

async function listScheduleRequests(page, limit) {
  const { requests, total } = await getScheduleRequests(page, limit);
  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: requests,
  };
}

async function getScheduleRequestDetails(requestId) {
  return await getScheduleRequestById(requestId);
}

async function adminApproveRequest(requestId, adminId) {
  // 1. Approve
  await approveScheduleRequest(requestId);

  // 2. Lấy schedules
  const { schedules } = await getScheduleRequestById(requestId);

  // 3. Sinh slot (GIỮ NGUYÊN LOGIC CỦA BẠN)
  for (const schedule of schedules) {
    const startMin = timeToMinutes(normalizeTime(schedule.startTime));
    let endMin = timeToMinutes(normalizeTime(schedule.endTime));
    if (endMin <= startMin) endMin += 1440;

    for (let m = startMin; m < endMin; m += 30) {
      await generateSlots({
        scheduleId: schedule.scheduleId,
        startTime: minutesToHHMMSS(m),
        endTime: minutesToHHMMSS(Math.min(m + 30, endMin)),
      });
    }
  }

  // 4. GÁN 1 Y TÁ / 1 SCHEDULE (ÍT CA NHẤT)
  for (const schedule of schedules) {
    const nurse = await getLeastBusyAvailableNurse(
      schedule.workDate,
      schedule.startTime,
      schedule.endTime
    );

    if (!nurse) {
      console.warn("Không có y tá rảnh cho schedule:", schedule.scheduleId);
      continue;
    }

    await createNurseShift({
      scheduleId: schedule.scheduleId,
      nurseId: nurse.userId,
      assignedBy: adminId,
    });
    const workDateStr = new Date(schedule.workDate).toLocaleDateString("vi-VN");

    const startTimeStr = formatTimeHHmm(schedule.startTime);
    const endTimeStr = formatTimeHHmm(schedule.endTime);

    await sendNotification({
      receiverId: nurse.userId,
      senderId: adminId,
      title: "Phân công ca trực",
      message: `Bạn được phân công hỗ trợ bác sĩ
Ngày ${workDateStr}
Từ ${startTimeStr} đến ${endTimeStr}`,
      type: "nurse_shift",
    });
  }

  // 5. Notify doctor
  if (schedules.length > 0) {
    await sendNotification({
      receiverId: schedules[0].doctorId,
      senderId: adminId,
      title: "Lịch làm việc đã được duyệt",
      message: "Lịch làm việc của bạn đã được duyệt và y tá đã được phân công.",
      type: "schedule_approved",
    });
  }

  return { success: true };
}

async function adminRejectRequest(requestId, adminId, reason) {
  return await rejectScheduleRequest(requestId, adminId, reason);
}

async function getSchedulesByDoctor(doctorId) {
  const schedules = await getDoctorSchedules(doctorId);
  return schedules.map((s) => ({
    scheduleId: s.scheduleId,
    workDate: formatDateToYMDUTC(s.workDate),
    startTime: formatSqlTime(s.startTime),
    endTime: formatSqlTime(s.endTime),
    room: s.roomName,
    status: s.status,
    requestId: s.requestId,
  }));
}

async function getDoctorScheduleDetailService(scheduleId, doctorId) {
  const schedule = await getScheduleDetailByDoctor(scheduleId, doctorId);
  if (!schedule) throw new Error("Schedule not found");
  return schedule;
}

async function cancelScheduleRequestService(requestId, doctorId) {
  const pool = await getPool();

  const r = await pool.request().input("requestId", sql.Int, requestId).query(`
      SELECT status, doctorId
      FROM ScheduleRequests
      WHERE requestId = @requestId
    `);

  if (!r.recordset.length) throw new Error("NOT_FOUND");

  const req = r.recordset[0];

  if (req.doctorId !== doctorId) throw new Error("FORBIDDEN");

  // ⛔ ĐÃ DUYỆT / TỪ CHỐI → CẤM HỦY
  if (req.status !== "Pending") {
    throw new Error("CANNOT_CANCEL");
  }

  await deleteScheduleByRequestId(requestId);
  await deleteScheduleRequest(requestId);
}

// ======================================================
module.exports = {
  createMultipleSchedules,
  checkAvailability,
  listScheduleRequests,
  getScheduleRequestDetails,
  adminApproveRequest,
  adminRejectRequest,
  getSchedulesByDoctor,
  getDoctorScheduleDetailService,
  cancelScheduleRequestService,
};
