
const { getPool, sql } = require('../config/db');

const dashboardController = {
  // Tổng quan dashboard
  async getOverviewStats(req, res) {
    try {
      const pool = await getPool();

      // Tổng số appointments
      const totalAppointmentsQuery = `SELECT COUNT(*) as total FROM Appointments`;
      const totalAppointments = await pool.request().query(totalAppointmentsQuery);

      // Tổng số hóa đơn đã thanh toán
      const totalInvoicesQuery = `SELECT COUNT(*) as total FROM Invoices WHERE status = 'Paid'`;
      const totalInvoices = await pool.request().query(totalInvoicesQuery);

      // Tổng doanh thu
      const totalRevenueQuery = `SELECT SUM(totalAmount - discountAmount) as total FROM Invoices WHERE status = 'Paid'`;
      const totalRevenue = await pool.request().query(totalRevenueQuery);

      // Tổng số bệnh nhân
      const totalPatientsQuery = `SELECT COUNT(*) as total FROM Users WHERE roleId = (SELECT roleId FROM Roles WHERE roleName = 'Patient')`;
      const totalPatients = await pool.request().query(totalPatientsQuery);

      // Tổng số bác sĩ
      const totalDoctorsQuery = `SELECT COUNT(*) as total FROM Users WHERE roleId = (SELECT roleId FROM Roles WHERE roleName = 'Doctor')`;
      const totalDoctors = await pool.request().query(totalDoctorsQuery);

      res.json({
        totalAppointments: totalAppointments.recordset[0].total,
        totalInvoices: totalInvoices.recordset[0].total,
        totalRevenue: totalRevenue.recordset[0].total || 0,
        totalPatients: totalPatients.recordset[0].total,
        totalDoctors: totalDoctors.recordset[0].total
      });
    } catch (error) {
      console.error('Error in getOverviewStats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Thống kê doanh thu
  async getRevenueStats(req, res) {
    try {
      const pool = await getPool();

      // Doanh thu theo tháng
      const monthlyRevenueQuery = `
        SELECT YEAR(issuedDate) as year, MONTH(issuedDate) as month, SUM(totalAmount - discountAmount) as revenue
        FROM Invoices
        WHERE status = 'Paid'
        GROUP BY YEAR(issuedDate), MONTH(issuedDate)
        ORDER BY year DESC, month DESC
      `;
      const monthlyRevenue = await pool.request().query(monthlyRevenueQuery);

      // Doanh thu theo năm
      const yearlyRevenueQuery = `
        SELECT YEAR(issuedDate) as year, SUM(totalAmount - discountAmount) as revenue
        FROM Invoices
        WHERE status = 'Paid'
        GROUP BY YEAR(issuedDate)
        ORDER BY year DESC
      `;
      const yearlyRevenue = await pool.request().query(yearlyRevenueQuery);

      // Doanh thu từ dịch vụ
      const serviceRevenueQuery = `
        SELECT s.serviceName, SUM(s.price) as revenue
        FROM DiagnosisServices ds
        JOIN Services s ON ds.serviceId = s.serviceId
        JOIN Diagnoses d ON ds.diagnosisId = d.diagnosisId
        JOIN Invoices i ON d.appointmentId = i.appointmentId AND i.status = 'Paid'
        GROUP BY s.serviceName
        ORDER BY revenue DESC
      `;
      const serviceRevenue = await pool.request().query(serviceRevenueQuery);

      // Doanh thu theo trạng thái hóa đơn
      const invoiceStatusRevenueQuery = `
        SELECT status, SUM(totalAmount - discountAmount) as revenue
        FROM Invoices
        GROUP BY status
      `;
      const invoiceStatusRevenue = await pool.request().query(invoiceStatusRevenueQuery);

      res.json({
        monthlyRevenue: monthlyRevenue.recordset,
        yearlyRevenue: yearlyRevenue.recordset,
        serviceRevenue: serviceRevenue.recordset,
        invoiceStatusRevenue: invoiceStatusRevenue.recordset
      });
    } catch (error) {
      console.error('Error in getRevenueStats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Thống kê thanh toán
  async getPaymentStats(req, res) {
    try {
      const pool = await getPool();

      // Số lượng thanh toán theo phương thức
      const paymentMethodQuery = `
        SELECT paymentMethod, COUNT(*) as count, SUM(amount) as totalAmount
        FROM Payments
        GROUP BY paymentMethod
      `;
      const paymentMethod = await pool.request().query(paymentMethodQuery);

      // Thanh toán theo tháng
      const monthlyPaymentQuery = `
        SELECT YEAR(paymentDate) as year, MONTH(paymentDate) as month, COUNT(*) as count, SUM(amount) as totalAmount
        FROM Payments
        GROUP BY YEAR(paymentDate), MONTH(paymentDate)
        ORDER BY year DESC, month DESC
      `;
      const monthlyPayment = await pool.request().query(monthlyPaymentQuery);

      res.json({
        paymentMethodStats: paymentMethod.recordset,
        monthlyPaymentStats: monthlyPayment.recordset
      });
    } catch (error) {
      console.error('Error in getPaymentStats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Lấy danh sách tất cả appointments
  async getAllAppointments(req, res) {
    try {
      const pool = await getPool();
      const query = `
        SELECT a.appointmentId, a.createdAt AS date, a.status, 
               p.fullName AS patientName, d.fullName AS doctorName
        FROM Appointments a
        LEFT JOIN Users p ON a.patientId = p.userId
        LEFT JOIN Users d ON a.doctorId = d.userId
        ORDER BY a.createdAt DESC
      `;
      const result = await pool.request().query(query);
      const data = result.recordset.map(item => ({
        appointmentId: item.appointmentId,
        date: item.date,
        patientName: item.patientName,
        doctorName: item.doctorName,
        status: item.status
      }));
      res.json(data);
    } catch (error) {
      console.error('Error in getAllAppointments:', error);
      res.status(500).json({ error: 'Internal server error', errorDetails: error });
    }
  },

  // Lấy danh sách tất cả hóa đơn đã thanh toán
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
      const data = result.recordset.map(item => ({
        invoiceId: item.invoiceId,
        issuedDate: item.issuedDate,
        totalAmount: item.totalAmount,
        discountAmount: item.discountAmount,
        status: item.status
      }));
      res.json(data);
    } catch (error) {
      console.error('Error in getAllPaidInvoices:', error);
      res.status(500).json({ error: 'Internal server error', errorDetails: error });
    }
  },

  // Lấy danh sách tất cả bệnh nhân
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
      res.status(500).json({ error: 'Internal server error' , errorDetails: error });
    }
  },

  // Lấy danh sách tất cả bác sĩ
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
      res.status(500).json({ error: 'Internal server error' , errorDetails: error });
    }
  },
};

module.exports = dashboardController;