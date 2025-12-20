
const { getPool, sql } = require('../config/db');

const statisticsController = {
  // Thống kê appointments
  async getAppointmentStats(req, res) {
    try {
      const pool = await getPool();

      // Số lượng appointments theo trạng thái
      const statusQuery = `
        SELECT status, COUNT(*) as count
        FROM Appointments
        GROUP BY status
      `;
      const statusResult = await pool.request().query(statusQuery);

      // Số lượng appointments theo bác sĩ
      const doctorQuery = `
        SELECT u.fullName as doctorName, COUNT(a.appointmentId) as count
        FROM Appointments a
        JOIN Users u ON a.doctorId = u.userId
        GROUP BY u.fullName
        ORDER BY count DESC
      `;
      const doctorResult = await pool.request().query(doctorQuery);

      // Số lượng appointments theo tháng
      const monthlyQuery = `
        SELECT YEAR(createdAt) as year, MONTH(createdAt) as month, COUNT(*) as count
        FROM Appointments
        GROUP BY YEAR(createdAt), MONTH(createdAt)
        ORDER BY year DESC, month DESC
      `;
      const monthlyResult = await pool.request().query(monthlyQuery);

      res.json({
        statusStats: statusResult.recordset,
        doctorStats: doctorResult.recordset,
        monthlyStats: monthlyResult.recordset
      });
    } catch (error) {
      console.error('Error in getAppointmentStats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Thống kê dịch vụ
  async getServiceStats(req, res) {
    try {
      const pool = await getPool();

      // Số lượng sử dụng dịch vụ và doanh thu
      const serviceQuery = `
        SELECT s.serviceName, COUNT(ds.diagnosisId) as usageCount, SUM(s.price) as revenue
        FROM DiagnosisServices ds
        JOIN Services s ON ds.serviceId = s.serviceId
        GROUP BY s.serviceName
        ORDER BY usageCount DESC
      `;
      const serviceResult = await pool.request().query(serviceQuery);

      // Dịch vụ phổ biến theo tháng
      const monthlyServiceQuery = `
        SELECT s.serviceName, YEAR(d.createdAt) as year, MONTH(d.createdAt) as month, COUNT(ds.diagnosisId) as count
        FROM DiagnosisServices ds
        JOIN Services s ON ds.serviceId = s.serviceId
        JOIN Diagnoses d ON ds.diagnosisId = d.diagnosisId
        GROUP BY s.serviceName, YEAR(d.createdAt), MONTH(d.createdAt)
        ORDER BY year DESC, month DESC, count DESC
      `;
      const monthlyServiceResult = await pool.request().query(monthlyServiceQuery);

      res.json({
        serviceStats: serviceResult.recordset,
        monthlyServiceStats: monthlyServiceResult.recordset
      });
    } catch (error) {
      console.error('Error in getServiceStats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Thống kê bác sĩ
  async getDoctorStats(req, res) {
    try {
      const pool = await getPool();

      // Số lượng appointments và doanh thu theo bác sĩ
      const doctorQuery = `
        SELECT u.fullName as doctorName, COUNT(a.appointmentId) as appointmentCount,
               SUM(i.totalAmount - i.discountAmount) as revenue
        FROM Appointments a
        JOIN Users u ON a.doctorId = u.userId
        LEFT JOIN Invoices i ON a.appointmentId = i.appointmentId AND i.status = 'Paid'
        GROUP BY u.fullName
        ORDER BY appointmentCount DESC
      `;
      const doctorResult = await pool.request().query(doctorQuery);

      res.json({
        doctorStats: doctorResult.recordset
      });
    } catch (error) {
      console.error('Error in getDoctorStats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Thống kê thuốc
  async getMedicineStats(req, res) {
    try {
      const pool = await getPool();

      // Số lượng thuốc được kê đơn
      const medicineQuery = `
        SELECT m.medicineName, SUM(pi.quantity) as totalQuantity
        FROM PrescriptionItems pi
        JOIN Medicines m ON pi.medicineId = m.medicineId
        GROUP BY m.medicineName
        ORDER BY totalQuantity DESC
      `;
      const medicineResult = await pool.request().query(medicineQuery);

      // Thuốc theo tháng
      const monthlyMedicineQuery = `
        SELECT m.medicineName, YEAR(p.createdAt) as year, MONTH(p.createdAt) as month, SUM(pi.quantity) as totalQuantity
        FROM PrescriptionItems pi
        JOIN Medicines m ON pi.medicineId = m.medicineId
        JOIN Prescriptions p ON pi.prescriptionId = p.prescriptionId
        GROUP BY m.medicineName, YEAR(p.createdAt), MONTH(p.createdAt)
        ORDER BY year DESC, month DESC, totalQuantity DESC
      `;
      const monthlyMedicineResult = await pool.request().query(monthlyMedicineQuery);

      res.json({
        medicineStats: medicineResult.recordset,
        monthlyMedicineStats: monthlyMedicineResult.recordset
      });
    } catch (error) {
      console.error('Error in getMedicineStats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Thống kê đánh giá
  async getRatingStats(req, res) {
    try {
      const pool = await getPool();

      // Đánh giá bác sĩ trung bình
      const doctorRatingQuery = `
        SELECT u.fullName as doctorName, AVG(dr.rating) as avgRating, COUNT(dr.ratingId) as ratingCount
        FROM DoctorRatings dr
        JOIN Users u ON dr.doctorId = u.userId
        GROUP BY u.fullName
        ORDER BY avgRating DESC
      `;
      const doctorRatingResult = await pool.request().query(doctorRatingQuery);

      // Đánh giá dịch vụ trung bình
      const serviceRatingQuery = `
        SELECT s.serviceName, AVG(sr.rating) as avgRating, COUNT(sr.ratingId) as ratingCount
        FROM ServiceRatings sr
        JOIN Services s ON sr.serviceId = s.serviceId
        GROUP BY s.serviceName
        ORDER BY avgRating DESC
      `;
      const serviceRatingResult = await pool.request().query(serviceRatingQuery);

      res.json({
        doctorRatings: doctorRatingResult.recordset,
        serviceRatings: serviceRatingResult.recordset
      });
    } catch (error) {
      console.error('Error in getRatingStats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Thống kê tổng quan
  async getOverallStats(req, res) {
    try {
      const pool = await getPool();

      const totalAppointmentsQuery = 'SELECT COUNT(*) as total FROM Appointments';
      const totalAppointmentsResult = await pool.request().query(totalAppointmentsQuery);

      const totalRevenueQuery = 'SELECT SUM(totalAmount - discountAmount) as totalRevenue FROM Invoices WHERE status = \'Paid\'';
      const totalRevenueResult = await pool.request().query(totalRevenueQuery);

      const totalDoctorsQuery = 'SELECT COUNT(*) as total FROM Users WHERE roleId = (SELECT roleId FROM Roles WHERE roleName = \'Doctor\')';
      const totalDoctorsResult = await pool.request().query(totalDoctorsQuery);

      const totalPatientsQuery = 'SELECT COUNT(*) as total FROM Users WHERE roleId = (SELECT roleId FROM Roles WHERE roleName = \'Patient\')';
      const totalPatientsResult = await pool.request().query(totalPatientsQuery);

      res.json({
        totalAppointments: totalAppointmentsResult.recordset[0].total,
        totalRevenue: totalRevenueResult.recordset[0].totalRevenue || 0,
        totalDoctors: totalDoctorsResult.recordset[0].total,
        totalPatients: totalPatientsResult.recordset[0].total
      });
    } catch (error) {
      console.error('Error in getOverallStats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
    // Lấy danh sách chi tiết tất cả appointments
  async getAllAppointments(req, res) {
    try {
      const pool = await getPool();
      const query = `
        SELECT a.appointmentId, a.createdAt, a.status, 
               p.fullName AS patientName, d.fullName AS doctorName
        FROM Appointments a
        LEFT JOIN Users p ON a.patientId = p.userId
        LEFT JOIN Users d ON a.doctorId = d.userId
        ORDER BY a.createdAt DESC
      `;
      const result = await pool.request().query(query);
      res.json(result.recordset);
    } catch (error) {
      console.error('Error in getAllAppointments:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Lấy danh sách chi tiết tất cả bác sĩ
  async getAllDoctors(req, res) {
    try {
      const pool = await getPool();
      const query = `
        SELECT userId, fullName, phone, email, gender, dob, address, experience, bio, avatar, isActive, createdAt, updatedAt
        FROM Users
        WHERE roleId = (SELECT roleId FROM Roles WHERE roleName = 'Doctor')
        ORDER BY fullName
      `;
      const result = await pool.request().query(query);
      const data = result.recordset.map(item => ({
        userId: item.userId,
        fullName: item.fullName,
        phoneNumber: item.phone,
        email: item.email,
        gender: item.gender,
        dob: item.dob,
        address: item.address,
        experience: item.experience,
        bio: item.bio,
        avatar: item.avatar,
        isActive: item.isActive,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }));
      res.json(data);
    } catch (error) {
      console.error('Error in getAllDoctors:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Lấy danh sách chi tiết tất cả bệnh nhân
  async getAllPatients(req, res) {
    try {
      const pool = await getPool();
      const query = `
        SELECT userId, fullName, phone, email, gender, dob, address, isActive, createdAt, updatedAt, avatar, citizenIdNumber, ethnicity, occupation
        FROM Users
        WHERE roleId = (SELECT roleId FROM Roles WHERE roleName = 'Patient')
        ORDER BY fullName
      `;
      const result = await pool.request().query(query);
      const data = result.recordset.map(item => ({
        userId: item.userId,
        fullName: item.fullName,
        phoneNumber: item.phone,
        email: item.email,
        gender: item.gender,
        dob: item.dob,
        address: item.address,
        isActive: item.isActive,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        avatar: item.avatar,
        citizenIdNumber: item.citizenIdNumber,
        ethnicity: item.ethnicity,
        occupation: item.occupation
      }));
      res.json(data);
    } catch (error) {
      console.error('Error in getAllPatients:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Lấy danh sách chi tiết doanh thu hóa đơn đã thanh toán
  async getAllPaidInvoices(req, res) {
    try {
      const pool = await getPool();
      const query = `
        SELECT invoiceId, issuedDate, totalAmount, discountAmount, status
        FROM Invoices
        WHERE status = 'Paid'
        ORDER BY issuedDate DESC
      `;
      const result = await pool.request().query(query);
      res.json(result.recordset);
    } catch (error) {
      console.error('Error in getAllPaidInvoices:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = statisticsController;