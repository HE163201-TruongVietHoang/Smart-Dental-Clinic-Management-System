const express = require("express");
const router = express.Router();
const controller = require("../controllers/materialController");
const authorizeRoles = require("../middlewares/roleMiddleware");
const { authMiddleware } = require("../middlewares/authMiddleware");

router.get(
  "/",
  authMiddleware,
  authorizeRoles("ClinicManager", "Nurse"),
  controller.getAllMaterials
);
router.post(
  "/add",
  authMiddleware,
  authorizeRoles("ClinicManager"),
  controller.addNewMaterial
);

router.get(
  "/transactions",
  authMiddleware,
  authorizeRoles("ClinicManager"),
  controller.getAllTransactions
);
router.post(
  "/import",
  authMiddleware,
  authorizeRoles("ClinicManager"),
  controller.importMaterial
);
router.get(
  "/report",
  authMiddleware,
  authorizeRoles("ClinicManager"),
  controller.getMaterialUsageReport
);

router.put(
  "/service/:serviceId/material/:materialId",
  authMiddleware,
  authorizeRoles("ClinicManager"),
  controller.updateServiceMaterial
);

router.post(
  "/service/:serviceId/material",
  authMiddleware,
  authorizeRoles("ClinicManager"),
  controller.addMaterialToService
);

router.delete(
  "/service/:serviceId/material/:materialId",
  authMiddleware,
  authorizeRoles("ClinicManager"),
  controller.removeMaterialFromService
);

router.get(
  "/service/all",
  authMiddleware,
  authorizeRoles("ClinicManager"),
  controller.getAllServices
);

router.get(
  "/service/materials",
  authMiddleware,
  authorizeRoles("ClinicManager"),
  controller.getAllServiceMaterials
);

router.get(
  "/appointments",
  authMiddleware,
  authorizeRoles("Nurse"),
  controller.getTodayAppointments
);
router.post(
  "/use",
  authMiddleware,
  authorizeRoles("Nurse"),
  controller.useMaterial
);
router.post(
  "/return",
  authMiddleware,
  authorizeRoles("Nurse"),
  controller.returnMaterial
);
router.post(
  "/used",
  authMiddleware,
  authorizeRoles("Nurse"),
  controller.addUsedMaterial
);
router.get(
  "/service/:serviceId",
  authMiddleware,
  authorizeRoles("Nurse"),
  controller.getMaterialsByService
);
router.get(
  "/appointment/:appointmentId/materials",
  authMiddleware,
  authorizeRoles("Nurse"),
  controller.getMaterialsByAppointment
);

router.get(
  "/report/summary",
  authMiddleware,
  authorizeRoles("ClinicManager"),
  controller.getMaterialSummaryReport
);

router.get(
  "/report/detail",
  authMiddleware,
  authorizeRoles("ClinicManager"),
  controller.getMaterialDetailReport
);

module.exports = router;
