const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Áp dụng middleware xác thực cho tất cả routes
// router.use(authMiddleware);

// Routes cho dashboard

// Tổng quan, thống kê
router.get('/overview', dashboardController.getOverviewStats);
router.get('/revenue', dashboardController.getRevenueStats);
router.get('/payments', dashboardController.getPaymentStats);

// Chi tiết cho dashboard overview
router.get('/appointments', dashboardController.getAllAppointments);
router.get('/invoices', dashboardController.getAllPaidInvoices);
router.get('/patients', dashboardController.getAllPatients);
router.get('/doctors', dashboardController.getAllDoctors);

module.exports = router;