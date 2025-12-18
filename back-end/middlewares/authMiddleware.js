const jwt = require("jsonwebtoken");
const { getPool } = require("../config/db");
const sql = require("mssql");

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader)
      return res.status(401).json({ error: "No token provided" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const pool = await getPool();
    const result = await pool
      .request()
      .input("userId", sql.Int, decoded.userId)
      .input("jwtToken", sql.NVarChar, token)
      .query(`SELECT * FROM dbo.UserSessions 
              WHERE userId = @userId AND jwtToken = @jwtToken AND isActive = 1`);

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: "Session không hợp lệ" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized" });
  }
}

module.exports = { authMiddleware };
