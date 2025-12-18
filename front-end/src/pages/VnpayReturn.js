import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Button, Spinner } from 'react-bootstrap';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from "../components/home/Header/Header";
import Footer from "../components/home/Footer/Footer";
import axios from 'axios';
import { FaCheckCircle, FaTimesCircle, FaArrowLeft } from 'react-icons/fa';

const VnpayReturn = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleVnpayReturn = async () => {
      try {
        // Lấy tất cả query params từ URL
        const params = {};
        for (let [key, value] of searchParams.entries()) {
          params[key] = value;
        }

        // Gọi API backend để verify và update payment
        const response = await axios.get('http://localhost:5000/api/payments/vnpay_return_url', {
          params
        });

        if (response.data.success) {
          setResult({
            success: true,
            message: response.data.message || 'Thanh toán thành công!',
            paymentId: params.vnp_TxnRef,
            amount: params.vnp_Amount / 100, // VNPay trả về *100
            transactionNo: params.vnp_TransactionNo
          });
        } else {
          setResult({
            success: false,
            message: response.data.message || 'Thanh toán thất bại!'
          });
        }
      } catch (err) {
        console.error('Error verifying payment:', err);
        setError('Có lỗi xảy ra khi kiểm tra thanh toán. Vui lòng liên hệ hỗ trợ.');
      } finally {
        setLoading(false);
      }
    };

    handleVnpayReturn();
  }, [searchParams]);

  const handleBackToInvoices = () => {
    navigate('/invoice/me');
  };

  const css = `
    html, body, #root {
      height: 100%;
    }
    .vnpay-return-bg {
      min-height: 100vh;
      background: linear-gradient(135deg, #e3f0ff 0%, #f8fbff 100%);
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .vnpay-return-container {
      flex: 1 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      padding-top: 32px;
      padding-bottom: 32px;
    }
    .vnpay-return-loading-container {
      min-height: 60vh;
      width: 100vw;
    }
    .vnpay-return-card {
      border-radius: 1.5rem !important;
      background: #fff;
      box-shadow: 0 6px 32px 0 rgba(0, 60, 180, 0.08);
      width: 100%;
      max-width: 520px;
      margin: 0 auto;
    }
    .vnpay-return-info {
      background: #f4f8ff;
      border-radius: 1rem;
      padding: 1.5rem 1rem;
      margin-bottom: 1rem;
      font-size: 1.1rem;
    }
    .vnpay-return-btn {
      transition: background 0.2s, color 0.2s;
      font-size: 1.1rem;
    }
    .vnpay-return-btn:hover, .vnpay-return-btn:focus {
      background: #0d6efd;
      color: #fff;
      border-color: #0d6efd;
    }
    @media (max-width: 576px) {
      .vnpay-return-card {
        padding: 0.5rem !important;
        max-width: 100vw;
      }
      .vnpay-return-info {
        padding: 1rem 0.5rem;
        font-size: 1rem;
      }
      .vnpay-return-container {
        padding-top: 8px;
        padding-bottom: 8px;
      }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="vnpay-return-bg">
        <Header />
        {loading ? (
          <Container className="d-flex justify-content-center align-items-center vnpay-return-loading-container">
            <div className="text-center">
              <Spinner animation="border" role="status" variant="primary" style={{ width: 60, height: 60 }}>
                <span className="visually-hidden">Đang kiểm tra thanh toán...</span>
              </Spinner>
              <p className="mt-4 fw-semibold fs-5 text-primary">Đang kiểm tra kết quả thanh toán...</p>
            </div>
          </Container>
        ) : (
          <Container className="vnpay-return-container">
            <Row className="justify-content-center w-100 m-0">
              <Col xs={12} md={10} lg={7} xl={6} className="p-0">
                <Card className="shadow-lg border-0 rounded-4 vnpay-return-card">
                  <Card.Body className="text-center p-5">
                    <h2 className="mb-4 fw-bold text-primary">Kết quả thanh toán</h2>
                    {error && (
                      <Alert variant="danger" className="mb-4 fs-5">
                        <FaTimesCircle className="me-2 text-danger" size={28} />
                        {error}
                      </Alert>
                    )}
                    {result && (
                      <div>
                        {result.success && result.message !== 'Payment failed' ? (
                          <div>
                            <Alert variant="success" className="d-flex align-items-center justify-content-center gap-2 mb-4 fs-5">
                              <FaCheckCircle className="me-2 text-success" size={28} />
                              <span>{
                                result.message === 'Payment successful'
                                  ? 'Thanh toán thành công!'
                                  : result.message === 'Payment failed'
                                    ? 'Thanh toán thất bại!'
                                    : result.message
                              }</span>
                            </Alert>
                            <div className="vnpay-return-info mb-4">
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="fw-semibold">Mã Thanh toán:</span>
                                <span className="text-primary">#{result.paymentId}</span>
                              </div>
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="fw-semibold">Số tiền:</span>
                                <span className="text-success fs-5">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(result.amount)}</span>
                              </div>
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="fw-semibold">Mã giao dịch:</span>
                                <span>{result.transactionNo}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <Alert variant="danger" className="d-flex align-items-center justify-content-center gap-2 mb-4 fs-5">
                            <FaTimesCircle className="me-2 text-danger" size={28} />
                            <span>{
                              result.message === 'Payment successful'
                                ? 'Thanh toán thành công!'
                                : result.message === 'Payment failed'
                                  ? 'Thanh toán thất bại!'
                                  : result.message
                            }</span>
                          </Alert>
                        )}
                        <Button variant="outline-primary" className="px-4 py-2 rounded-pill fw-semibold vnpay-return-btn mt-2" onClick={handleBackToInvoices}>
                          <FaArrowLeft className="me-2" />Quay lại danh sách hóa đơn
                        </Button>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Container>
        )}
        <Footer />
      </div>
    </>
  );
};
export default VnpayReturn;