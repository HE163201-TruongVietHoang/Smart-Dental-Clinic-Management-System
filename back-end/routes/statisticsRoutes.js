const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Áp dụng middleware xác thực cho tất cả routes
router.use(authMiddleware);

// Routes cho thống kê
router.get('/appointments', statisticsController.getAppointmentStats);
router.get('/services', statisticsController.getServiceStats);
router.get('/doctors', statisticsController.getDoctorStats);
router.get('/medicines', statisticsController.getMedicineStats);
router.get('/ratings', statisticsController.getRatingStats);
router.get('/overall', statisticsController.getOverallStats);

router.get('/all-appointments', statisticsController.getAllAppointments);
router.get('/all-doctors', statisticsController.getAllDoctors);
router.get('/all-patients', statisticsController.getAllPatients);
router.get('/all-paid-invoices', statisticsController.getAllPaidInvoices);
module.exports = router;