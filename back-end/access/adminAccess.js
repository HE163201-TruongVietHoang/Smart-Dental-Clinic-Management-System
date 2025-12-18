// src/access/adminAccess.js
const { sql, getPool } = require("../config/db");
const bcrypt = require("bcrypt");

// Lấy tất cả người dùng
async function getAllUsers() {
  const pool = await getPool();
  const result = await pool.request().query("SELECT u.*, r.roleName FROM Users u JOIN Roles r ON u.roleId = r.roleId");
  return result.recordset;
}

// Lấy user theo ID
async function getUserById(userId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .query("SELECT u.*, r.roleName FROM Users u JOIN Roles r ON u.roleId = r.roleId WHERE u.userId=@userId");

  return result.recordset[0];
}

// Tạo user mới
async function createUser({
  fullName,
  phone,
  email,
  password,
  gender,
  dob,
  address,
  roleId,
  isActive,
  isVerify,
}) {
  const pool = await getPool();
  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

  const result = await pool
    .request()
    .input("fullName", sql.NVarChar, fullName)
    .input("phone", sql.NVarChar, phone)
    .input("email", sql.NVarChar, email)
    .input("password", sql.NVarChar, hashedPassword)
    .input("gender", sql.NVarChar, gender)
    .input("dob", sql.Date, dob)
    .input("address", sql.NVarChar, address)
    .input("roleId", sql.Int, roleId)
    .input("isActive", sql.Bit, isActive ?? true)
    .input("isVerify", sql.Bit, isVerify ?? false).query(`
      INSERT INTO Users (fullName, phone, email, password, gender, dob, address, roleId, isActive, isVerify, createdAt, updatedAt)
      VALUES (@fullName, @phone, @email, @password, @gender, @dob, @address, @roleId, @isActive, @isVerify, GETDATE(), GETDATE());
      SELECT SCOPE_IDENTITY() AS userId;
    `);

  return result.recordset[0];
}

// Cập nhật user
async function updateUser({
  userId,
  fullName,
  phone,
  email,
  gender,
  dob,
  address,
  roleId,
  isActive,
  isVerify,
}) {
  const pool = await getPool();
  await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("fullName", sql.NVarChar, fullName)
    .input("phone", sql.NVarChar, phone)
    .input("email", sql.NVarChar, email)
    .input("gender", sql.NVarChar, gender)
    .input("dob", sql.Date, dob)
    .input("address", sql.NVarChar, address)
    .input("roleId", sql.Int, roleId)
    .input("isActive", sql.Bit, isActive)
    .input("isVerify", sql.Bit, isVerify).query(`
      UPDATE Users SET
        fullName=@fullName,
        phone=@phone,
        email=@email,
        gender=@gender,
        dob=@dob,
        address=@address,
        roleId=@roleId,
        isActive=@isActive,
        isVerify=@isVerify,
        updatedAt=GETDATE()
      WHERE userId=@userId
    `);
}

// Xóa user
async function deleteUser(userId) {
  const pool = await getPool();
  await pool
    .request()
    .input("userId", sql.Int, userId)
    .query("DELETE FROM Users WHERE userId=@userId");
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
