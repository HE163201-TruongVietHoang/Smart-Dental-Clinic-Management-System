const paymentService = require("../services/paymentService");

class PaymentController {
  async createPaymentUrl(req, res) {
    try {
      const result = await paymentService.createPaymentUrl(req);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async handleVnpayReturnUrl(req, res) {
    try {
      const result = await paymentService.handleVnpayReturnUrl(req);
      res.json({ success: true, message: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getAllPayments(req, res) {
    try {
      const payments = await paymentService.getAllPayments();
      res.json({ success: true, data: payments });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getPaymentsByUserId(req, res) {
    try {
      const userId = req.params.userId;
      const payments = await paymentService.getPaymentsByUserId(userId);
      res.json({ success: true, data: payments });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new PaymentController();
