const { sql, getPool } = require("../config/db");

/**
 * Lấy y tá RẢNH + ÍT CA NHẤT trong tuần
 * Nếu bằng nhau → random
 */
async function getLeastBusyAvailableNurse(workDate, startTime, endTime) {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("workDate", sql.Date, workDate)
    .input("startTime", sql.Time, startTime)
    .input("endTime", sql.Time, endTime).query(`
      DECLARE @weekStart DATE = DATEADD(DAY, 1 - DATEPART(WEEKDAY, @workDate), @workDate);
      DECLARE @weekEnd   DATE = DATEADD(DAY, 7 - DATEPART(WEEKDAY, @workDate), @workDate);

      SELECT TOP 1
        u.userId,
        u.fullName,
        COUNT(ns.shiftId) AS totalShifts
      FROM Users u
      JOIN Roles r ON u.roleId = r.roleId

      LEFT JOIN NurseShifts ns ON ns.nurseId = u.userId
      LEFT JOIN Schedules s2 ON s2.scheduleId = ns.scheduleId
        AND s2.workDate BETWEEN @weekStart AND @weekEnd
        AND ns.status = 'Assigned'

      WHERE r.roleName = 'Nurse'
        AND u.isActive = 1

        -- KHÔNG TRÙNG GIỜ
        AND u.userId NOT IN (
          SELECT ns2.nurseId
          FROM NurseShifts ns2
          JOIN Schedules s ON ns2.scheduleId = s.scheduleId
          WHERE s.workDate = @workDate
            AND ns2.status = 'Assigned'
            AND s.startTime < @endTime
            AND s.endTime > @startTime
        )

      GROUP BY u.userId, u.fullName
      ORDER BY COUNT(ns.shiftId) ASC, NEWID();
    `);

  return result.recordset[0] || null;
}

/**
 * Tạo ca trực cho y tá
 */
async function createNurseShift({ scheduleId, nurseId, assignedBy }) {
  const pool = await getPool();
  await pool
    .request()
    .input("scheduleId", sql.Int, scheduleId)
    .input("nurseId", sql.Int, nurseId)
    .input("assignedBy", sql.Int, assignedBy).query(`
      INSERT INTO NurseShifts (scheduleId, nurseId, assignedBy, status)
      VALUES (@scheduleId, @nurseId, @assignedBy, 'Assigned')
    `);
}

/**
 * Lấy danh sách ca trực của y tá (UI "Ca của tôi")
 */
async function getAllNurseSchedules(nurseId) {
  const pool = await getPool();
  const result = await pool.request().input("nurseId", sql.Int, nurseId).query(`
      SELECT 
        ns.shiftId,
        s.workDate,
        s.startTime,
        s.endTime,
        d.fullName AS doctorName,
        r.roomName,
        ns.status
      FROM NurseShifts ns
      JOIN Schedules s ON ns.scheduleId = s.scheduleId
      JOIN Users d ON s.doctorId = d.userId
      LEFT JOIN Rooms r ON s.roomId = r.roomId
      WHERE ns.nurseId = @nurseId
      ORDER BY s.workDate DESC, s.startTime ASC
    `);

  return result.recordset;
}

// nurseAccess.js
async function getNurseScheduleDetail(shiftId) {
  const pool = await getPool();
  const result = await pool.request().input("shiftId", sql.Int, shiftId).query(`
      SELECT
        ns.shiftId,
        ns.status            AS nurseShiftStatus,
        ns.createdAt         AS shiftCreatedAt,

        s.scheduleId,
        s.workDate,
        s.startTime,
        s.endTime,
        s.status             AS scheduleStatus,

        d.userId             AS doctorId,
        d.fullName           AS doctorName,

        r.roomId,
        r.roomName,

        sr.requestId
      FROM NurseShifts ns
      JOIN Schedules s ON ns.scheduleId = s.scheduleId
      JOIN Users d ON s.doctorId = d.userId
      LEFT JOIN Rooms r ON s.roomId = r.roomId
      LEFT JOIN ScheduleRequests sr ON sr.scheduleId = s.scheduleId
      WHERE ns.shiftId = @shiftId
    `);

  return result.recordset;
}

module.exports = {
  getLeastBusyAvailableNurse,
  createNurseShift,
  getAllNurseSchedules,
  getNurseScheduleDetail,
};
