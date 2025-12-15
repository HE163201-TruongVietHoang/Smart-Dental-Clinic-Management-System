const { getPool, sql } = require("../config/db");

const doctorAccess = {
  async getAll() {
    try {
      const pool = await getPool(); // kết nối SQL Server
      const result = await pool.request().query(`
          SELECT u.userId, u.fullName, u.email, u.phone, u.gender, u.dob, u.address, u.avatar, u.experience, u.bio
          FROM Users u
          JOIN Roles r ON u.roleId = r.roleId
          WHERE r.roleName = 'Doctor' AND u.isActive = '1'
        `);
      return result.recordset;
    } catch (err) {
      console.error("Error in doctorAccess.getAllDoctors:", err);
      throw err;
    }
  },
  async getById(userId) {
    try {
      const pool = await getPool();
      const result = await pool.request().input("userId", sql.Int, userId)
        .query(`
          SELECT u.userId, u.fullName, u.email, u.phone, u.gender, u.dob, u.address, u.avatar, u.experience, u.bio
          FROM Users u
          JOIN Roles r ON u.roleId = r.roleId
          WHERE r.roleName = 'Doctor' AND u.isActive = '1' AND u.userId = @userId
        `);

      return result.recordset[0] || null;
    } catch (err) {
      console.error("Error in doctorAccess.getById:", err);
      throw err;
    }
  },
};

module.exports = doctorAccess;
