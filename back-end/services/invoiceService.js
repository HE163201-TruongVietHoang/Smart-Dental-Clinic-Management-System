const {
  create,
  getAll,
  getById,
  update,
  getByPatientId,
} = require("../access/invoiceAccess");
const promotionService = require("./promotionService");

class InvoiceService {
  async createInvoice(data) {
    // Tính discount nếu có promotion
    let discountAmount = 0;
    if (data.promotionId) {
      // Giả sử lấy promotion và tính discount
      const promotion = await promotionService.getPromotionById(
        data.promotionId
      );
      if (promotion && promotion.isActive) {
        if (promotion.discountType === "percent") {
          discountAmount = (data.totalAmount * promotion.discountValue) / 100;
        } else if (promotion.discountType === "amount") {
          discountAmount = promotion.discountValue;
        }
      }
    }
    data.discountAmount = discountAmount;
    return await create(data);
  }

  async getAllInvoices() {
    return await getAll();
  }

  async getInvoiceById(id) {
    return await getById(id);
  }

  async updateInvoice(id, data) {
    await update(id, data);
    return await getById(id);
  }

  async getInvoicesByPatient(patientId) {
    return await getByPatientId(patientId);
  }
}

module.exports = new InvoiceService();
