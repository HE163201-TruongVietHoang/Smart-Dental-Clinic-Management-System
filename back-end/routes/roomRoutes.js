const express = require("express");
const router = express.Router();
const roomController = require("../controllers/roomController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

router.use(authMiddleware);

router.use(authorizeRoles("ClinicManager"));

router.get("/", roomController.getAllRooms);
router.get("/:id", roomController.getRoomById);
router.post("/", roomController.createRoom);
router.put("/:id", roomController.updateRoom);
router.delete("/:id", roomController.deleteRoom);

module.exports = router;