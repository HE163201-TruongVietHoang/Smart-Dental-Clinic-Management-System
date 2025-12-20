
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Container, Row, Col, Card, Alert, Spinner, Form, Button, Modal, Table } from 'react-bootstrap';
import { FaUserMd, FaUserInjured, FaCalendarCheck, FaFileInvoiceDollar, FaMoneyBillWave } from 'react-icons/fa';
import { MdAttachMoney } from 'react-icons/md';
import './DashboardPage.css';

const DashboardPage = () => {
  const [overview, setOverview] = useState({});
  const [revenue, setRevenue] = useState({});
  const [payments, setPayments] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalData, setModalData] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  // Handler to open modal and fetch detail data
  const handleShowModal = async (type) => {
    setModalType(type);
    setShowModal(true);
    setModalLoading(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      let res;
      switch (type) {
        case 'appointments':
          res = await axios.get('http://localhost:5000/api/dashboard/appointments', config);
          setModalData(res.data || []);
          break;
        case 'invoices':
          res = await axios.get('http://localhost:5000/api/dashboard/invoices', config);
          setModalData(res.data || []);
          break;
        case 'patients':
          res = await axios.get('http://localhost:5000/api/dashboard/patients', config);
          setModalData(res.data || []);
          break;
        case 'doctors':
          res = await axios.get('http://localhost:5000/api/dashboard/doctors', config);
          setModalData(res.data || []);
          break;
        default:
          setModalData([]);
      }
    } catch (err) {
      setModalData([]);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalType(null);
    setModalData([]);
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = {
          headers: { Authorization: `Bearer ${token}` },
        };

        const [ovRes, revRes, payRes] = await Promise.all([
          axios.get('http://localhost:5000/api/dashboard/overview', config),
          axios.get('http://localhost:5000/api/dashboard/revenue', config),
          axios.get('http://localhost:5000/api/dashboard/payments', config),
        ]);

        setOverview(ovRes.data);
        setRevenue(revRes.data);
        setPayments(payRes.data);
      } catch (err) {
        setError('Failed to load dashboard');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Filter data based on selected year
  const filteredMonthlyRevenue = (revenue.monthlyRevenue || []).filter(stat => stat.year === selectedYear);
  const filteredMonthlyPayments = (payments.monthlyPaymentStats || []).filter(stat => stat.year === selectedYear);

  // Export all data as zip of CSVs
  const exportAllToZip = async () => {
    // Dynamically import JSZip only when needed
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    // Helper to convert array to CSV string
    const toCSV = (data, headers = []) => {
      if (!data || data.length === 0) return '';
      const csvRows = [];
      if (headers.length > 0) {
        csvRows.push(headers.join(','));
      } else {
        csvRows.push(Object.keys(data[0]).join(','));
      }
      data.forEach(row => {
        csvRows.push(Object.values(row).join(','));
      });
      return csvRows.join('\n');
    };
    // Prepare all datasets
    zip.file('monthly_revenue.csv', toCSV(revenue.monthlyRevenue || []));
    zip.file('yearly_revenue.csv', toCSV(revenue.yearlyRevenue || []));
    zip.file('service_revenue.csv', toCSV(revenue.serviceRevenue || []));
    zip.file('invoice_status_revenue.csv', toCSV(revenue.invoiceStatusRevenue || []));
    zip.file('payment_methods.csv', toCSV(payments.paymentMethodStats || []));
    zip.file('monthly_payments.csv', toCSV((payments.monthlyPaymentStats || []).filter(stat => stat.year === selectedYear)));
    // Generate and download zip
    zip.generateAsync({ type: 'blob' }).then(content => {
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'dashboard_exports.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  };


  if (loading) return (
    <Container className="d-flex justify-content-center align-items-center bg-light" style={{ height: '100vh' }}>
      <Spinner animation="border" variant="success" />
      <span className="ms-2 text-success fw-bold">Loading...</span>
    </Container>
  );

  if (error) return (
    <Container className="mt-5">
      <Alert variant="danger" className="text-center shadow rounded-4">{error}</Alert>
    </Container>
  );


  return (
    <Container fluid className="mt-4 bg-light min-vh-100 px-4 px-md-5 pb-5">
      <h1 className="text-center mb-4 fw-bold" style={{ color: '#27ae60', letterSpacing: 1.5, fontFamily: 'Segoe UI', textShadow: '0 2px 8px #b2f7c1' }}>
        Dashboard Quản Lý Doanh Thu
      </h1>

      {/* Filter */}
      <Row className="mb-4 align-items-end">
        <Col md={4}>
          <Form.Group>
            <Form.Label className="fw-semibold">Chọn Năm</Form.Label>
            <Form.Control as="select" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} style={{ borderRadius: 12, boxShadow: '0 2px 8px #e0e0e0' }}>
              <option value={2023}>2023</option>
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
            </Form.Control>
          </Form.Group>
        </Col>
        <Col md={8} className="d-flex flex-wrap gap-2 justify-content-md-end justify-content-center mt-3 mt-md-0">
          <Button variant="success" onClick={exportAllToZip} className="export-btn">Export All</Button>
        </Col>
      </Row>


      {/* Overview */}
      <Row className="mb-5">
        <Col>
          <Card className="shadow rounded-4 border-0">
            <Card.Header style={{ background: 'linear-gradient(90deg, #2ecc71 60%, #b2f7c1 100%)', color: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
              <h2 className="mb-0 fw-bold"><FaMoneyBillWave className="me-2 mb-1" />Tổng Quan</h2>
            </Card.Header>
            <Card.Body>
              <Row className="g-3 justify-content-center">
                {/* Tổng Appointments */}
                <Col md={2} xs={6}>
                  <div className="p-3 text-center stat-card-overview stat-card-hover" style={{cursor:'pointer'}} onClick={() => handleShowModal('appointments')}>
                    <FaCalendarCheck size={32} className="mb-2 text-success" />
                    <h4 className="fw-bold text-success mb-1">{overview.totalAppointments || 0}</h4>
                    <p className="text-muted mb-0">Tổng Appointments</p>
                  </div>
                </Col>
                {/* Tổng Hóa Đơn */}
                <Col md={2} xs={6}>
                  <div className="p-3 text-center stat-card-overview stat-card-hover" style={{cursor:'pointer'}} onClick={() => handleShowModal('invoices')}>
                    <FaFileInvoiceDollar size={32} className="mb-2 text-primary" />
                    <h4 className="fw-bold text-primary mb-1">{overview.totalInvoices || 0}</h4>
                    <p className="text-muted mb-0">Hóa Đơn Đã Thanh Toán</p>
                  </div>
                </Col>
                {/* Tổng Doanh Thu */}
                <Col md={2} xs={6}>
                  <div className="p-3 text-center stat-card-overview" style={{cursor:'not-allowed', opacity:0.7}}>
                    <MdAttachMoney size={32} className="mb-2 text-danger" />
                    <h4 className="fw-bold text-danger mb-1">{(overview.totalRevenue || 0).toLocaleString()} VND</h4>
                    <p className="text-muted mb-0">Tổng Doanh Thu</p>
                  </div>
                </Col>
                {/* Tổng Bệnh Nhân */}
                <Col md={2} xs={6}>
                  <div className="p-3 text-center stat-card-overview stat-card-hover" style={{cursor:'pointer'}} onClick={() => handleShowModal('patients')}>
                    <FaUserInjured size={32} className="mb-2" style={{ color: '#8e44ad' }} />
                    <h4 className="fw-bold mb-1" style={{ color: '#8e44ad' }}>{overview.totalPatients || 0}</h4>
                    <p className="text-muted mb-0">Tổng Bệnh Nhân</p>
                  </div>
                </Col>
                {/* Tổng Bác Sĩ */}
                <Col md={4} xs={12}>
                  <div className="p-3 text-center stat-card-overview stat-card-hover" style={{cursor:'pointer'}} onClick={() => handleShowModal('doctors')}>
                    <FaUserMd size={32} className="mb-2 text-warning" />
                    <h4 className="fw-bold text-warning mb-1">{overview.totalDoctors || 0}</h4>
                    <p className="text-muted mb-0">Tổng Bác Sĩ</p>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal chi tiết */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg" centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>
            {modalType === 'appointments' && 'Danh sách Appointments'}
            {modalType === 'invoices' && 'Danh sách Hóa Đơn'}
            {modalType === 'patients' && 'Danh sách Bệnh Nhân'}
            {modalType === 'doctors' && 'Danh sách Bác Sĩ'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalLoading ? (
            <div className="d-flex justify-content-center align-items-center" style={{minHeight:200}}>
              <Spinner animation="border" variant="success" />
            </div>
          ) : (
            <div style={{maxHeight: '60vh', overflowY: 'auto'}}>
              {modalType === 'appointments' && (
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Ngày</th>
                      <th>Bệnh nhân</th>
                      <th>Bác sĩ</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalData.map((item, idx) => (
                      <tr key={item.appointmentId || idx}>
                        <td>{item.appointmentId}</td>
                        <td>{item.date || item.appointmentDate}</td>
                        <td>{item.patientName || item.patient?.fullName}</td>
                        <td>{item.doctorName || item.doctor?.fullName}</td>
                        <td>{(() => {
                          switch(item.status) {
                            case 'Cancelled': return 'Đã hủy';
                            case 'Completed': return 'Hoàn thành';
                            case 'DiagnosisCompleted': return 'Đã chẩn đoán';
                            case 'InProgress': return 'Đang thực hiện';
                            case 'Scheduled': return 'Đã lên lịch';
                            default: return item.status;
                          }
                        })()}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
                {modalType === 'invoices' && (
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Ngày</th>
                        <th>Tổng tiền</th>
                        <th>Giảm giá</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalData.map((item, idx) => (
                        <tr key={item.invoiceId || idx}>
                          <td>{item.invoiceId}</td>
                          <td>{item.issuedDate}</td>
                          <td>{item.totalAmount?.toLocaleString()} VND</td>
                          <td>{item.discountAmount?.toLocaleString()} VND</td>
                          <td>{(() => {
                            switch(item.status) {
                              case 'Cancelled': return 'Đã hủy';
                              case 'Paid': return 'Đã thanh toán';
                              case 'Pending': return 'Chờ thanh toán';
                              default: return item.status;
                            }
                          })()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              {modalType === 'patients' && (
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Họ tên</th>
                      <th>Email</th>
                      <th>SĐT</th>
                      <th>Giới tính</th>
                      <th>Ngày sinh</th>
                      <th>Địa chỉ</th>
                      <th>CMND/CCCD</th>
                      <th>Dân tộc</th>
                      <th>Nghề nghiệp</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalData.map((item, idx) => (
                      <tr key={item.userId || idx}>
                        <td>{item.userId}</td>
                        <td>{item.fullName}</td>
                        <td>{item.email}</td>
                        <td>{item.phoneNumber}</td>
                        <td>{item.gender}</td>
                        <td>{item.dob ? new Date(item.dob).toLocaleDateString() : ''}</td>
                        <td>
                          {item.address && item.address.length > 18 ? (
                            <span title={item.address} style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}>
                              {item.address.substring(0, 18) + '...'}
                            </span>
                          ) : (
                            item.address
                          )}
                        </td>
                        <td>{item.citizenIdNumber}</td>
                        <td>{item.ethnicity}</td>
                        <td>{item.occupation}</td>
                        <td>{item.isActive ? 'Hoạt động' : 'Không hoạt động'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
              {modalType === 'doctors' && (
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Họ tên</th>
                      <th>Email</th>
                      <th>SĐT</th>
                      <th>Giới tính</th>
                      <th>Ngày sinh</th>
                      <th>Địa chỉ</th>
                      <th>Kinh nghiệm</th>
                      <th>Tiểu sử</th>
                      <th>Ảnh đại diện</th>
                      <th>Trạng thái</th>
                      <th>Ngày tạo</th>
                      <th>Ngày cập nhật</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalData.map((item, idx) => (
                      <tr key={item.userId || idx}>
                        <td>{item.userId}</td>
                        <td>{item.fullName}</td>
                        <td>{item.email}</td>
                        <td>{item.phoneNumber}</td>
                        <td>{item.gender}</td>
                        <td>{item.dob ? new Date(item.dob).toLocaleDateString() : ''}</td>
                        <td>
                          {item.address && item.address.length > 18 ? (
                            <span title={item.address} style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}>
                              {item.address.substring(0, 18) + '...'}
                            </span>
                          ) : (
                            item.address
                          )}
                        </td>
                        <td>{item.experience}</td>
                        <td>{item.bio}</td>
                        <td>
                          {item.avatar ? (
                            <img src={item.avatar} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                          ) : ''}
                        </td>
                        <td>{item.isActive ? 'Hoạt động' : 'Không hoạt động'}</td>
                        <td>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</td>
                        <td>{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
              {modalData.length === 0 && <div className="text-center text-muted">Không có dữ liệu</div>}
            </div>
          )}
        </Modal.Body>
      </Modal>


      {/* Revenue Stats */}
      <Row className="mb-5">
        <Col>
          <Card className="shadow rounded-4 border-0">
            <Card.Header style={{ background: 'linear-gradient(90deg, #3498db 60%, #b2d7f7 100%)', color: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
              <h2 className="mb-0 fw-bold"><MdAttachMoney className="me-2 mb-1" />Thống Kê Doanh Thu</h2>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <h3 className="fw-semibold mb-3">Doanh Thu Theo Tháng</h3>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={filteredMonthlyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="revenue" stroke="#3498db" strokeWidth={3} dot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Col>
                <Col md={6}>
                  <h3 className="fw-semibold mb-3">Doanh Thu Theo Năm</h3>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={revenue.yearlyRevenue || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="revenue" fill="#3498db" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Col>
              </Row>
              <Row className="mt-4">
                <Col md={6}>
                  <h3 className="fw-semibold mb-3">Doanh Thu Từ Dịch Vụ</h3>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={revenue.serviceRevenue || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="serviceName" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="revenue" fill="#e74c3c" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Col>
                <Col md={6}>
                  <h3 className="fw-semibold mb-3">Doanh Thu Theo Trạng Thái Hóa Đơn</h3>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={revenue.invoiceStatusRevenue || []}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ status, revenue }) => `${status}: ${revenue} VND`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="revenue"
                        >
                          {(revenue.invoiceStatusRevenue || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Payment Stats */}
      <Row className="mb-5">
        <Col>
          <Card className="shadow rounded-4 border-0">
            <Card.Header style={{ background: 'linear-gradient(90deg, #9b59b6 60%, #e0c3fc 100%)', color: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
              <h2 className="mb-0 fw-bold"><FaMoneyBillWave className="me-2 mb-1" />Thống Kê Thanh Toán</h2>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <h3 className="fw-semibold mb-3">Theo Phương Thức</h3>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={payments.paymentMethodStats || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="paymentMethod" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#9b59b6" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="totalAmount" fill="#f39c12" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Col>
                <Col md={6}>
                  <h3 className="fw-semibold mb-3">Theo Tháng</h3>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={filteredMonthlyPayments}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="count" stroke="#9b59b6" strokeWidth={3} dot={{ r: 5 }} />
                        <Line type="monotone" dataKey="totalAmount" stroke="#f39c12" strokeWidth={3} dot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DashboardPage;