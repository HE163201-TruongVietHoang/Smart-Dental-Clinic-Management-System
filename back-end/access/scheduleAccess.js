const { getPool } = require("../config/db");
const sql = require("mssql");
const { normalizeTime } = require("../utils/timeUtils");

async function createScheduleRequest(doctorId, note) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("doctorId", sql.Int, doctorId)
    .input("note", sql.NVarChar, note).query(`
      INSERT INTO ScheduleRequests (doctorId, note)
      OUTPUT INSERTED.requestId
      VALUES (@doctorId, @note)
    `);

  return result.recordset[0].requestId;
}

async function createSchedule({
  requestId,
  doctorId,
  roomId,
  workDate,
  startTime,
  endTime,
}) {
  const pool = await getPool();

  let sStart = normalizeTime(startTime);
  let sEnd = normalizeTime(endTime);

  if (!sStart || !sEnd) throw new Error("startTime or endTime invalid");

  // Nếu end = "00:00:00", coi là 24:00 cùng ngày -> insert 23:59:59
  const isEndMidnight = sEnd === "00:00:00";
  if (isEndMidnight) {
    sEnd = "23:59:59";
  }

  console.debug("createSchedule - normalized times", { sStart, sEnd });

  if (sEnd < sStart) {
    // Ca overnight, tách 2 ngày
    const currentDate = new Date(workDate);
    const nextDate = new Date(currentDate);
    nextDate.setDate(currentDate.getDate() + 1);

    // Hôm nay: start -> 23:59:59
    await pool
      .request()
      .input("requestId", sql.Int, requestId)
      .input("doctorId", sql.Int, doctorId)
      .input("roomId", sql.Int, roomId)
      .input("workDate", sql.Date, workDate)
      .input("startTime", sql.NVarChar, sStart)
      .input("endTime", sql.NVarChar, "23:59:59").query(`
        INSERT INTO Schedules (requestId, doctorId, roomId, workDate, startTime, endTime, status)
        VALUES (@requestId,@doctorId,@roomId,@workDate,CAST(@startTime AS TIME),CAST(@endTime AS TIME),'Pending')
      `);

    // Ngày mai: 00:00:00 -> sEnd
    await pool
      .request()
      .input("requestId", sql.Int, requestId)
      .input("doctorId", sql.Int, doctorId)
      .input("roomId", sql.Int, roomId)
      .input("workDate", sql.Date, nextDate)
      .input("startTime", sql.NVarChar, "00:00:00")
      .input("endTime", sql.NVarChar, sEnd).query(`
        INSERT INTO Schedules (requestId, doctorId, roomId, workDate, startTime, endTime, status)
        VALUES (@requestId,@doctorId,@roomId,@workDate,CAST(@startTime AS TIME),CAST(@endTime AS TIME),'Pending')
      `);
  } else {
    // Ca bình thường trong ngày
    await pool
      .request()
      .input("requestId", sql.Int, requestId)
      .input("doctorId", sql.Int, doctorId)
      .input("roomId", sql.Int, roomId)
      .input("workDate", sql.Date, workDate)
      .input("startTime", sql.NVarChar, sStart)
      .input("endTime", sql.NVarChar, sEnd).query(`
        INSERT INTO Schedules (requestId, doctorId, roomId, workDate, startTime, endTime, status)
        VALUES (@requestId,@doctorId,@roomId,@workDate,CAST(@startTime AS TIME),CAST(@endTime AS TIME),'Pending')
      `);
  }
}

async function hasOverlappingSchedule(doctorId, workDate, startTime, endTime) {
  const pool = await getPool();

  const sStart = normalizeTime(startTime);
  const sEnd = normalizeTime(endTime);

  if (!sStart || !sEnd) throw new Error("startTime hoặc endTime không hợp lệ");

  const isOvernight = sEnd < sStart;

  const result = await pool
    .request()
    .input("doctorId", sql.Int, doctorId)
    .input("workDate", sql.Date, workDate)
    .input("startTime", sql.NVarChar, sStart)
    .input("endTime", sql.NVarChar, sEnd).query(`
      SELECT TOP 1 *
      FROM Schedules s
      JOIN Rooms r ON s.roomId = r.roomId
      WHERE s.doctorId = @doctorId
        AND s.status IN ('Pending','Approved')
        AND (
          (
            @endTime > @startTime
            AND s.workDate = @workDate
            AND CAST(s.startTime AS TIME) < CAST(@endTime AS TIME)
            AND CAST(s.endTime AS TIME) > CAST(@startTime AS TIME)
          )

          OR (
            @endTime < @startTime
            AND (
              (s.workDate = @workDate
                AND CAST(s.endTime AS TIME) > CAST(@startTime AS TIME)
                AND s.endTime > s.startTime)
              OR (s.workDate = DATEADD(DAY, 1, @workDate)
                AND CAST(s.startTime AS TIME) < CAST(@endTime AS TIME))
              OR (
                s.endTime <= s.startTime
                AND (
                  (s.workDate = @workDate AND CAST(@startTime AS TIME) < CAST(s.endTime AS TIME))
                  OR (s.workDate = DATEADD(DAY, -1, @workDate) AND CAST(@endTime AS TIME) > CAST(s.startTime AS TIME))
                )
              )
            )
          )
        )
    `);

  return result.recordset[0] || null;
}

async function getScheduleRequests(page = 1, limit = 10) {
  const pool = await getPool();
  const offset = (page - 1) * limit;

  const result = await pool.request().query(`
    SELECT 
      sr.requestId,
      sr.doctorId,
      u.fullName AS doctorName,
      sr.note,
      sr.createdAt,
      sr.status
    FROM ScheduleRequests sr
    LEFT JOIN Users u ON sr.doctorId = u.userId
    ORDER BY sr.createdAt DESC
    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;
  `);

  const countResult = await pool.request().query(`
    SELECT COUNT(*) AS total FROM ScheduleRequests;
  `);

  const requests = result.recordset;
  const total = countResult.recordset[0].total;

  return { requests, total };
}

async function getScheduleRequestById(requestId) {
  const pool = await getPool();

  // 1) Request info
  const reqResult = await pool.request().input("requestId", sql.Int, requestId)
    .query(`
      SELECT
        sr.requestId,
        sr.doctorId,
        u.fullName AS doctorName,
        sr.note,
        sr.createdAt,
        sr.status
      FROM ScheduleRequests sr
      LEFT JOIN Users u ON sr.doctorId = u.userId
      WHERE sr.requestId = @requestId
    `);

  const request = reqResult.recordset[0] || null;
  if (!request) return { request: null, schedules: [] };

  // 2) Schedules + Nurses (JOIN NurseShifts)
  const rowsResult = await pool.request().input("requestId", sql.Int, requestId)
    .query(`
      SELECT
        s.scheduleId,
        s.doctorId,
        s.roomId,
        s.workDate,
        s.startTime,
        s.endTime,
        s.status,

        r.roomName,

        ns.shiftId,
        ns.nurseId,
        un.fullName AS nurseName,
        ns.status AS nurseShiftStatus
      FROM Schedules s
      LEFT JOIN Rooms r ON s.roomId = r.roomId
      LEFT JOIN NurseShifts ns
        ON ns.scheduleId = s.scheduleId
       AND (ns.status IS NULL OR ns.status = 'Assigned')
      LEFT JOIN Users un ON ns.nurseId = un.userId
      WHERE s.requestId = @requestId
      ORDER BY s.workDate ASC, s.startTime ASC, ns.shiftId ASC
    `);

  const rows = rowsResult.recordset || [];

  // 3) Group nurses by scheduleId
  const map = new Map();

  for (const r of rows) {
    if (!map.has(r.scheduleId)) {
      map.set(r.scheduleId, {
        scheduleId: r.scheduleId,
        doctorId: r.doctorId,
        roomId: r.roomId,
        roomName: r.roomName || null,
        workDate: r.workDate,
        startTime: r.startTime,
        endTime: r.endTime,
        status: r.status,
        nurses: [],
      });
    }

    // Nếu có y tá được assign
    if (r.nurseId) {
      const item = map.get(r.scheduleId);

      // tránh trùng (phòng trường hợp join ra trùng)
      const existed = item.nurses.some((n) => n.nurseId === r.nurseId);
      if (!existed) {
        item.nurses.push({
          shiftId: r.shiftId,
          nurseId: r.nurseId,
          nurseName: r.nurseName,
          status: r.nurseShiftStatus || "Assigned",
        });
      }
    }
  }

  return {
    request,
    schedules: Array.from(map.values()),
  };
}

async function approveScheduleRequest(requestId, adminId) {
  const pool = await getPool();
  await pool
    .request()
    .input("requestId", sql.Int, requestId)
    .input("adminId", sql.Int, adminId).query(`
      UPDATE ScheduleRequests SET status = 'Approved' WHERE requestId = @requestId;
      UPDATE Schedules SET status = 'Approved' WHERE requestId = @requestId;
    `);
}

async function rejectScheduleRequest(requestId, adminId, reason = null) {
  const pool = await getPool();
  await pool
    .request()
    .input("requestId", sql.Int, requestId)
    .input("adminId", sql.Int, adminId)
    .input("reason", sql.NVarChar, reason).query(`
      UPDATE ScheduleRequests SET status = 'Rejected' WHERE requestId = @requestId;
      UPDATE Schedules SET status = 'Rejected' WHERE requestId = @requestId;
    `);
}

async function getDoctorSchedules(doctorId) {
  const pool = await getPool();
  const result = await pool.request().input("doctorId", sql.Int, doctorId)
    .query(`
      SELECT 
        s.scheduleId,
        s.workDate,
        s.startTime,
        s.endTime,
        s.status,
        r.roomId,
        r.roomName,
        sr.note,
        sr.createdAt AS requestCreatedAt,
        sr.requestId
      FROM Schedules s
      LEFT JOIN Rooms r ON s.roomId = r.roomId
      LEFT JOIN ScheduleRequests sr ON s.requestId = sr.requestId
      WHERE s.doctorId = @doctorId
      ORDER BY s.workDate DESC, s.startTime ASC
    `);
  return result.recordset;
}
function formatDateToYMD(date) {
  if (!date) return null;
  return new Date(date).toISOString().split("T")[0];
}
async function getScheduleDetailByDoctor(scheduleId, doctorId) {
  const pool = await getPool();

  const query = `
    SELECT 
      s.scheduleId,
      s.workDate,
      s.startTime,
      s.endTime,
      s.status,
      s.doctorId,
      r.roomId,
      r.roomName
    FROM Schedules s
    JOIN Rooms r ON s.roomId = r.roomId
    WHERE s.scheduleId = @scheduleId AND s.doctorId = @doctorId
  `;

  const scheduleResult = await pool
    .request()
    .input("scheduleId", sql.Int, scheduleId)
    .input("doctorId", sql.Int, doctorId)
    .query(query);

  if (scheduleResult.recordset.length === 0) return null;

  const schedule = scheduleResult.recordset[0];

  const slotsResult = await pool
    .request()
    .input("scheduleId", sql.Int, scheduleId).query(`
      SELECT slotId, startTime, endTime, isBooked
      FROM Slots
      WHERE scheduleId = @scheduleId
      ORDER BY startTime ASC
    `);

  return {
    scheduleId: schedule.scheduleId,
    workDate: formatDateToYMD(schedule.workDate),
    startTime: normalizeTime(schedule.startTime),
    endTime: normalizeTime(schedule.endTime),
    status: schedule.status,
    room: {
      roomId: schedule.roomId,
      roomName: schedule.roomName,
    },
    slots: slotsResult.recordset.map((s) => ({
      slotId: s.slotId,
      startTime: normalizeTime(s.startTime),
      endTime: normalizeTime(s.endTime),
      isBooked: !!s.isBooked,
    })),
  };
}
async function deleteScheduleByRequestId(requestId) {
  const pool = await getPool();
  await pool
    .request()
    .input("requestId", sql.Int, requestId)
    .query(`DELETE FROM Schedules WHERE requestId = @requestId`);
}

// Xóa request
async function deleteScheduleRequest(requestId) {
  const pool = await getPool();
  await pool
    .request()
    .input("requestId", sql.Int, requestId)
    .query(`DELETE FROM ScheduleRequests WHERE requestId = @requestId`);
}
module.exports = {
  createScheduleRequest,
  createSchedule,
  hasOverlappingSchedule,
  getScheduleRequests,
  getScheduleRequestById,
  approveScheduleRequest,
  rejectScheduleRequest,
  getDoctorSchedules,
  getScheduleDetailByDoctor,
  deleteScheduleByRequestId,
  deleteScheduleRequest,
};
