require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./config/db");
const cookieParser = require("cookie-parser");
const cron = require("node-cron");
const { appointmentService } = require("./services/appointmentService");
const promotionService = require("./services/promotionService");
const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const roleRoutes = require("./routes/roleRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const authMiddleware = require("./middlewares/authMiddleware");
const serviceStaffRoutes = require("./routes/serviceStaffRoutes");
const materialRoutes = require("./routes/materialRoutes");
const slotRoutes = require("./routes/slotRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const patientRoutes = require("./routes/patientRoutes");
const doctorDiagnosisRoutes = require("./routes/doctorDiagnosisRoutes");
const { getPool } = require("./config/db");
const promotionRoutes = require("./routes/promotionRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const statisticsRoutes = require("./routes/statisticsRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const nurseRoutes = require("./routes/nurseRoutes");
const adminRoutes = require("./routes/adminRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const roomRoutes = require("./routes/roomRoutes");
//const prescriptionRoutes = require("./routes/prescriptionRoutes");

const app = express();
const http = require("http");
const { initSocket } = require("./utils/socket");
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true, // QUAN TRỌNG: cho phép gửi cookie
  })
);
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/statistics", statisticsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/chat", chatRoutes);

app.use("/api/materials", materialRoutes);
app.use("/api/auth/doctors", doctorRoutes);
app.use("/api/rating", ratingRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/services", serviceStaffRoutes);
app.use("/api/slots", slotRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/diagnoses", doctorDiagnosisRoutes);
//app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/medicines", require("./routes/medicineRoutes"));
app.use("/api/invoices", invoiceRoutes);
app.use("/api/nurses", nurseRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/rooms", roomRoutes);
cron.schedule("* * * * *", async () => {
  await appointmentService.autoCancelNoShow(initSocket);
});
cron.schedule("0 0 * * *", async () => {
  console.log("Running deactivate expired promotions job...");
  await promotionService.deactivateExpiredPromotions();
});
getPool();

// Start server with Socket.IO
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
initSocket(server);
server.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});
