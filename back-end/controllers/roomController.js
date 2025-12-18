const roomService = require("../services/roomService");

class RoomController {
  async getAllRooms(req, res) {
    try {
      const rooms = await roomService.getAllRooms();
      res.status(200).json(rooms);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getRoomById(req, res) {
    try {
      const { id } = req.params;
      const room = await roomService.getRoomById(parseInt(id));
      res.status(200).json(room);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }

  async createRoom(req, res) {
    try {
      const roomData = req.body;
      const newRoom = await roomService.createRoom(roomData);
      res.status(201).json(newRoom);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async updateRoom(req, res) {
    try {
      const { id } = req.params;
      const roomData = req.body;
      const updatedRoom = await roomService.updateRoom(parseInt(id), roomData);
      res.status(200).json(updatedRoom);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async deleteRoom(req, res) {
    try {
      const { id } = req.params;
      const result = await roomService.deleteRoom(parseInt(id));
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
}

module.exports = new RoomController();