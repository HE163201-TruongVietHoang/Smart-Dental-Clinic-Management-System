const { getPool } = require("../config/db");
const sql = require("mssql");

async function findUserByEmailOrPhone(identifier) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("identifier", sql.NVarChar, identifier).query(`
      SELECT 
        u.userId, u.fullName, u.password, u.roleId, 
        r.roleName, u.otpCode, u.otpExpiresAt, 
        u.isActive, u.isVerify, u.email, u.phone
      FROM dbo.Users u
      JOIN dbo.Roles r ON u.roleId = r.roleId
      WHERE u.email = @identifier OR u.phone = @identifier
    `);
  return result.recordset[0];
}
async function activateUser(userId) {
  const pool = await getPool();
  await pool.request().input("userId", sql.Int, userId).query(`
      UPDATE dbo.Users
      SET isActive = 1, isVerify = 1, otpCode = NULL, otpExpiresAt = NULL
      WHERE userId = @userId
    `);
}
async function findUserByEmail(email) {
  const pool = await getPool();
  const result = await pool.request().input("email", sql.NVarChar, email)
    .query(`
      SELECT userId, email
      FROM dbo.Users
      WHERE email = @email
    `);
  return result.recordset[0];
}

// 🔍 Kiểm tra phone tồn tại
async function findUserByPhone(phone) {
  const pool = await getPool();
  const result = await pool.request().input("phone", sql.NVarChar, phone)
    .query(`
      SELECT userId, phone
      FROM dbo.Users
      WHERE phone = @phone
    `);
  return result.recordset[0];
}
async function getUserById(userId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .query(
      `SELECT u.userId, u.fullName, u.email, u.phone, u.gender, u.dob, u.address, u.experience, u.bio,u.avatar , u.citizenIdNumber, u.occupation, u.ethnicity, r.roleName, u.createdAt
           FROM dbo.Users u
           JOIN dbo.Roles r ON u.roleId = r.roleId
           WHERE u.userId = @userId`
    );

  return result.recordset[0];
}

async function setOtpForUser(userId, otpCode, expiresAt) {
  const pool = await getPool();
  await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("otpCode", sql.NVarChar, otpCode)
    .input("otpExpiresAt", sql.DateTime, expiresAt)
    .query(
      `UPDATE dbo.Users SET otpCode = @otpCode, otpExpiresAt = @otpExpiresAt WHERE userId = @userId`
    );
}

async function updatePassword(userId, hashedPassword) {
  const pool = await getPool();
  await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("password", sql.NVarChar, hashedPassword)
    .query(
      `UPDATE dbo.Users SET password = @password, otpCode = NULL, otpExpiresAt = NULL WHERE userId = @userId`
    );
}

async function createUser({
  email,
  password,
  fullName,
  phone,
  gender,
  dob,
  address,
}) {
  const pool = await getPool();

  const roleResult = await pool
    .request()
    .input("roleName", sql.NVarChar, "Patient")
    .query(`SELECT roleId FROM dbo.Roles WHERE roleName = @roleName`);

  if (roleResult.recordset.length === 0) {
    throw new Error("Role 'Patient' not found in Roles table.");
  }

  const roleId = roleResult.recordset[0].roleId;

  const result = await pool
    .request()
    .input("email", sql.NVarChar, email)
    .input("password", sql.NVarChar, password)
    .input("fullName", sql.NVarChar, fullName)
    .input("phone", sql.NVarChar, phone)
    .input("gender", sql.NVarChar, gender)
    .input("dob", sql.Date, dob)
    .input("address", sql.NVarChar, address)
    .input("roleId", sql.Int, roleId)
    .input("isActive", sql.Bit, true)
    .input("isVerify", sql.Bit, false).query(`
      INSERT INTO dbo.Users (email, password, fullName, phone, gender, dob, address, roleId)
      VALUES (@email, @password, @fullName, @phone, @gender, @dob, @address, @roleId);
      SELECT SCOPE_IDENTITY() AS userId;
    `);

  return result.recordset[0];
}
async function verifyUserOtp(userId, otpCode) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("otpCode", sql.NVarChar, otpCode).query(`
      SELECT userId, fullName, otpCode, otpExpiresAt, isVerify, roleName
      FROM dbo.Users
      Join dbo.Roles ON dbo.Users.roleId = dbo.Roles.roleId
      WHERE userId = @userId
    `);

  return result.recordset[0];
}
async function getUsers({ page = 1, pageSize = 10, search = "", roleId }) {
  const pool = await getPool();
  const offset = (page - 1) * pageSize;
  const searchPattern = `%${search}%`;

  let whereClause =
    "(u.username LIKE @search OR u.email LIKE @search OR u.fullName LIKE @search)";
  if (roleId !== undefined) {
    whereClause += " AND u.roleId = @roleId";
  }

  const request = pool
    .request()
    .input("search", sql.NVarChar, searchPattern)
    .input("offset", sql.Int, offset)
    .input("pageSize", sql.Int, pageSize);
  if (roleId !== undefined) {
    request.input("roleId", sql.Int, roleId);
  }

  const result =
    await request.query(`SELECT u.userId, u.username, u.email, u.fullName, u.phone, u.gender, u.dob, u.address, u.roleId, r.roleName, u.isActive
            FROM dbo.Users u
            JOIN dbo.Roles r ON u.roleId = r.roleId
            WHERE ${whereClause}
            ORDER BY u.userId DESC
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`);

  // Count query
  let countWhereClause =
    "(username LIKE @search OR email LIKE @search OR fullName LIKE @search)";
  const countRequest = pool
    .request()
    .input("search", sql.NVarChar, searchPattern);
  if (roleId !== undefined) {
    countWhereClause += " AND roleId = @roleId";
    countRequest.input("roleId", sql.Int, roleId);
  }
  const countResult = await countRequest.query(
    `SELECT COUNT(*) AS total FROM dbo.Users WHERE ${countWhereClause}`
  );
  return { users: result.recordset, total: countResult.recordset[0].total };
}

async function findUserById(userId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("userId", sql.Int, userId)
    .query(
      `SELECT u.userId, u.email, u.fullName, u.phone, u.gender, u.dob, u.address, u.citizenIdNumber, u.occupation, u.ethnicity, u.roleId, r.roleName, u.isActive
           FROM dbo.Users u
           JOIN dbo.Roles r ON u.roleId = r.roleId
           WHERE u.userId = @userId`
    );
  return result.recordset[0];
}

async function updateUser(
  userId,
  { fullName, phone, gender, dob, address, roleId }
) {
  const pool = await getPool();
  await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("fullName", sql.NVarChar, fullName)
    .input("phone", sql.NVarChar, phone)
    .input("gender", sql.NVarChar, gender)
    .input("dob", sql.Date, dob)
    .input("address", sql.NVarChar, address)
    .input("roleId", sql.Int, roleId)
    .query(
      `UPDATE dbo.Users SET fullName = @fullName, phone = @phone, gender = @gender, dob = @dob, address = @address, roleId = @roleId WHERE userId = @userId`
    );
}

async function changeUserRole(userId, roleId) {
  const pool = await getPool();
  await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("roleId", sql.Int, roleId)
    .query(`UPDATE dbo.Users SET roleId = @roleId WHERE userId = @userId`);
}

async function setUserActive(userId, isActive) {
  const pool = await getPool();
  await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("isActive", sql.Bit, isActive ? 1 : 0)
    .query(`UPDATE dbo.Users SET isActive = @isActive WHERE userId = @userId`);
}

async function deleteUser(userId) {
  const pool = await getPool();
  await pool
    .request()
    .input("userId", sql.Int, userId)
    .query(`DELETE FROM dbo.Users WHERE userId = @userId`);
}

const updateUserProfile = async (userId, data) => {
  const {
    fullName,
    phone,
    gender,
    dob,
    address,
    experience,
    bio,
    citizenIdNumber,
    occupation,
    ethnicity,
  } = data;
  const pool = await getPool();
  await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("fullName", sql.NVarChar, fullName)
    .input("phone", sql.NVarChar, phone)
    .input("gender", sql.NVarChar, gender)
    .input("dob", sql.Date, dob)
    .input("address", sql.NVarChar, address)
    .input("experience", sql.Int, experience)
    .input("bio", sql.NVarChar, bio)
    .input("citizenIdNumber", sql.NVarChar, citizenIdNumber)
    .input("occupation", sql.NVarChar, occupation)
    .input("ethnicity", sql.NVarChar, ethnicity).query(`
          UPDATE Users
          SET fullName=@fullName, phone=@phone, gender=@gender, dob=@dob, address=@address, experience=@experience, bio=@bio, updatedAt=GETDATE(), 
          citizenIdNumber=@citizenIdNumber, occupation=@occupation, ethnicity=@ethnicity 
          WHERE userId=@userId
        `);
};

const getUserSessions = async (userId) => {
  const pool = await getPool();
  const result = await pool.request().input("userId", sql.Int, userId).query(`
          SELECT sessionId, jwtToken, userAgent, ipAddress, isActive, createdAt 
          FROM UserSessions 
          WHERE userId=@userId AND isActive=1
        `);
  return result.recordset;
};

const logoutSession = async (sessionId) => {
  const pool = await getPool();
  await pool
    .request()
    .input("sessionId", sql.Int, sessionId)
    .query(`UPDATE UserSessions SET isActive=0 WHERE sessionId=@sessionId`);
};

const logoutAllSessions = async (userId) => {
  const pool = await getPool();
  await pool
    .request()
    .input("userId", sql.Int, userId)
    .query(`UPDATE UserSessions SET isActive=0 WHERE userId=@userId`);
};
const updateAvatar = async (userId, avatarUrl) => {
  const pool = await getPool();
  await pool
    .request()
    .input("userId", sql.Int, userId)
    .input("avatar", sql.NVarChar(255), avatarUrl).query(`
      UPDATE Users
      SET avatar = @avatar, updatedAt = GETDATE()
      WHERE userId = @userId
    `);

  return true;
};
async function getFirstReceptionist() {
  const pool = await getPool();
  const result = await pool.request().query(`
      SELECT TOP 1 u.userId, u.fullName, u.email, u.phone
      FROM dbo.Users u
      JOIN dbo.Roles r ON u.roleId = r.roleId
      WHERE r.roleName = 'Receptionist' AND u.isActive = 1
      ORDER BY NEWID()
    `);
  return result.recordset[0];
}
async function getAllReceptionist() {
  const pool = await getPool();
  const result = await pool.request().query(`
      SELECT u.userId, u.fullName, u.email, u.phone
      FROM dbo.Users u
      JOIN dbo.Roles r ON u.roleId = r.roleId
      WHERE r.roleName = 'Receptionist' AND u.isActive = 1
    `);
  return result.recordset;
}

module.exports = {
  findUserByEmailOrPhone,
  activateUser,
  setOtpForUser,
  updatePassword,
  createUser,
  getUsers,
  findUserById,
  updateUser,
  changeUserRole,
  setUserActive,
  deleteUser,
  getUserById,
  updateUserProfile,
  getUserSessions,
  logoutSession,
  logoutAllSessions,
  findUserByEmail,
  findUserByPhone,
  verifyUserOtp,
  updateAvatar,
  getFirstReceptionist,
  getAllReceptionist,
};
