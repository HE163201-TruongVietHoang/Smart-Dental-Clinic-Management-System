const { getPool } = require("../config/db");
const sql = require("mssql");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

//check trung ten
const normalizeVietnamese = (str = "") =>
  str
    .toLowerCase()
    .normalize("NFD") // tách dấu
    .replace(/[\u0300-\u036f]/g, "") // bỏ dấu
    .replace(/đ/g, "d")
    .trim();
const isDuplicateServiceName = async (
  pool,
  serviceName,
  excludeServiceId = null
) => {
  const result = await pool.request().query(`
    SELECT serviceId, serviceName
    FROM Services
  `);

  const newName = normalizeVietnamese(serviceName);

  return result.recordset.some((s) => {
    if (excludeServiceId && s.serviceId === Number(excludeServiceId)) {
      return false;
    }
    return normalizeVietnamese(s.serviceName) === newName;
  });
};

// Lấy tất cả dịch vụ
exports.getAllServices = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT * FROM [Services]");
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching services:", err);
    res.status(500).json({ error: "Failed to fetch services" });
  }
};

// Lấy dịch vụ theo ID
exports.getServiceById = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("serviceId", sql.Int, req.params.id)
      .query("SELECT * FROM [Services] WHERE serviceId = @serviceId");

    if (result.recordset.length === 0)
      return res.status(404).json({ message: "Service not found" });

    res.json(result.recordset[0]);
  } catch (err) {
    console.error("Error getting service:", err);
    res.status(500).json({ error: "Failed to get service" });
  }
};

// Thêm mới dịch vụ
exports.createService = async (req, res) => {
  try {
    const { serviceName, description, price, duration } = req.body;
    const pool = await getPool();
    let imageUrl = null;

    // Nếu có file ảnh
    if (req.file) {
      const streamifier = require("streamifier");

      const streamUpload = (buffer) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "services" },
            (error, result) => {
              if (error) {
                console.error("Cloudinary upload error:", error);
                reject(error);
              } else {
                resolve(result);
              }
            }
          );
          streamifier.createReadStream(buffer).pipe(stream);
        });
      };

      try {
        const result = await streamUpload(req.file.buffer);
        imageUrl = result.secure_url;
      } catch (err) {
        console.error("Error uploading to Cloudinary:", err);
        return res.status(400).json({ error: "Failed to upload image" });
      }
    }

    // Kiểm tra dữ liệu trước khi insert
    if (!serviceName || !price) {
      return res
        .status(400)
        .json({ error: "serviceName and price are required" });
    }

    // Kiểm tra trùng tên
    const isDuplicate = await isDuplicateServiceName(pool, serviceName);
    if (isDuplicate) {
      return res.status(409).json({
        message: "Tên dịch vụ đã tồn tại",
      });
    }

    await pool
      .request()
      .input("serviceName", sql.NVarChar, serviceName)
      .input("description", sql.NVarChar, description)
      .input("price", sql.Decimal(18, 2), price)
      .input("duration", sql.Int, duration)
      .input("imageUrl", sql.NVarChar, imageUrl).query(`
        INSERT INTO [Services] (serviceName, description, price, duration, imageUrl, createdAt, updatedAt)
        VALUES (@serviceName, @description, @price, @duration, @imageUrl, GETDATE(), GETDATE())
      `);

    res.status(201).json({ message: "Service created successfully" });
  } catch (err) {
    console.error("Error creating service:", err);
    res.status(500).json({ error: "Failed to create service" });
  }
};

// Cập nhật dịch vụ
exports.updateService = async (req, res) => {
  try {
    const { serviceName, description, price, duration } = req.body;
    const pool = await getPool();
    let imageUrl = null;

    // Nếu có file ảnh
    if (req.file) {
      const streamifier = require("streamifier");

      const streamUpload = (buffer) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "services" },
            (error, result) => {
              if (error) {
                console.error("Cloudinary upload error:", error);
                reject(error);
              } else {
                resolve(result);
              }
            }
          );
          streamifier.createReadStream(buffer).pipe(stream);
        });
      };

      try {
        const result = await streamUpload(req.file.buffer);
        imageUrl = result.secure_url;
      } catch (err) {
        console.error("Error uploading to Cloudinary:", err);
        return res.status(400).json({ error: "Failed to upload image" });
      }
    }

    // Kiểm tra dữ liệu trước khi insert
    if (!serviceName || !price) {
      return res
        .status(400)
        .json({ error: "serviceName and price are required" });
    }

    // CHECK TRÙNG TÊN (loại trừ chính nó)
    const isDuplicate = await isDuplicateServiceName(
      pool,
      serviceName,
      req.params.id
    );

    if (isDuplicate) {
      return res.status(409).json({
        message: "Tên dịch vụ đã tồn tại",
      });
    }

    await pool
      .request()
      .input("serviceId", sql.Int, req.params.id)
      .input("serviceName", sql.NVarChar, serviceName)
      .input("description", sql.NVarChar, description)
      .input("price", sql.Decimal(18, 2), price)
      .input("duration", sql.Int, duration)
      .input("imageUrl", sql.NVarChar, imageUrl).query(`
        UPDATE [Services]
        SET serviceName = @serviceName,
            description = @description,
            price = @price,
            duration = @duration,
            imageUrl = @imageUrl,
            updatedAt = GETDATE()
        WHERE serviceId = @serviceId
      `);

    res.json({ message: "Service updated successfully" });
  } catch (err) {
    console.error("Error updating service:", err);
    res.status(500).json({ error: "Failed to update service" });
  }
};

// Xóa dịch vụ
exports.deleteService = async (req, res) => {
  try {
    const pool = await getPool();
    const serviceId = req.params.id;

    // 🔥 1. Xóa bảng DiagnosisServices
    await pool
      .request()
      .input("serviceId", sql.Int, serviceId)
      .query("DELETE FROM DiagnosisServices WHERE serviceId = @serviceId");

    // 🔥 2. Xóa bảng ServiceMaterials
    await pool
      .request()
      .input("serviceId", sql.Int, serviceId)
      .query("DELETE FROM ServiceMaterials WHERE serviceId = @serviceId");

    // 🔥 3. Xóa bảng ServiceRatings
    await pool
      .request()
      .input("serviceId", sql.Int, serviceId)
      .query("DELETE FROM ServiceRatings WHERE serviceId = @serviceId");

    // 🔥 4. Xóa bảng AppointmentServices
    await pool
      .request()
      .input("serviceId", sql.Int, serviceId)
      .query("DELETE FROM AppointmentServices WHERE serviceId = @serviceId");

    // 🔥 5. Cuối cùng xóa bảng Services
    await pool
      .request()
      .input("serviceId", sql.Int, serviceId)
      .query("DELETE FROM Services WHERE serviceId = @serviceId");

    res.json({ message: "Service deleted successfully" });
  } catch (err) {
    console.error("Error deleting service:", err);
    res.status(500).json({ error: "Failed to delete service" });
  }
};
exports.uploadServiceImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Chưa chọn file" });

  try {
    const streamUpload = (fileBuffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "services" },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        streamifier.createReadStream(fileBuffer).pipe(stream);
      });
    };

    const result = await streamUpload(req.file.buffer);
    res.json({ url: result.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload thất bại" });
  }
};
