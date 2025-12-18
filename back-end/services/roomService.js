const { getAllRooms, getRoomById, createRoom, updateRoom, deleteRoom } = require("../access/roomAccess");

class RoomService {
  async getAllRooms() {
    try {
      return await getAllRooms();
    } catch (error) {
      throw new Error("Lỗi khi lấy danh sách phòng: " + error.message);
    }
  }

  async getRoomById(roomId) {
    try {
      const room = await getRoomById(roomId);
      if (!room) {
        throw new Error("Phòng không tồn tại");
      }
      return room;
    } catch (error) {
      throw new Error("Lỗi khi lấy thông tin phòng: " + error.message);
    }
  }

  async createRoom(roomData) {
    try {
      const { roomName, status } = roomData;
      if (!roomName) {
        throw new Error("Tên phòng là bắt buộc");
      }
      return await createRoom(roomName, status || 'Available');
    } catch (error) {
      throw new Error("Lỗi khi tạo phòng: " + error.message);
    }
  }

  async updateRoom(roomId, roomData) {
    try {
      const { roomName, status } = roomData;
      if (!roomName) {
        throw new Error("Tên phòng là bắt buộc");
      }
      const success = await updateRoom(roomId, roomName, status);
      if (!success) {
        throw new Error("Phòng không tồn tại hoặc không thể cập nhật");
      }
      return { roomId, roomName, status };
    } catch (error) {
      throw new Error("Lỗi khi cập nhật phòng: " + error.message);
    }
  }

  async deleteRoom(roomId) {
    try {
      const success = await deleteRoom(roomId);
      if (!success) {
        throw new Error("Phòng không tồn tại hoặc không thể xóa");
      }
      return { message: "Xóa phòng thành công" };
    } catch (error) {
      throw new Error("Lỗi khi xóa phòng: " + error.message);
    }
  }
}

module.exports = new RoomService();