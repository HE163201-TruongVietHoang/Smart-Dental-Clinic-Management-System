const {
  getAvailable,
  checkSlot,
  markAsBooked,
} = require("../access/slotAccess");

const slotService = {
  async getAvailableSlots(doctorId, date) {
    return await getAvailable(doctorId, date);
  },

  async bookSlot(slotId) {
    const slot = await checkSlot(slotId);
    if (!slot) throw new Error("Slot không tồn tại");
    if (slot.isBooked) throw new Error("Slot đã được đặt");

    await markAsBooked(slotId);
    return slotId;
  },
};

module.exports = { slotService };
