import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Button,
  Modal,
  Badge,
  Spinner,
  Tabs,
  Tab,
} from "react-bootstrap";

export default function NurseSchedule() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("today");

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/nurses/schedules", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok) {
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.schedules)
          ? data.schedules
          : [];
        setSchedules(list);
      } else {
        setSchedules([]);
      }
    } catch (err) {
      console.error(err);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  // ===== PHÂN LOẠI CA =====
  const { todayShifts, upcomingShifts, pastShifts } = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);

    const today = [];
    const upcoming = [];
    const past = [];

    schedules.forEach((s) => {
      if (s.workDate === todayStr) today.push(s);
      else if (s.workDate > todayStr) upcoming.push(s);
      else past.push(s);
    });

    const sortByTimeAsc = (a, b) =>
      new Date(`${a.workDate}T${a.startTime}`) -
      new Date(`${b.workDate}T${b.startTime}`);

    const sortByTimeDesc = (a, b) =>
      new Date(`${b.workDate}T${b.startTime}`) -
      new Date(`${a.workDate}T${a.startTime}`);

    today.sort(sortByTimeAsc);
    upcoming.sort(sortByTimeAsc);
    past.sort(sortByTimeDesc);

    return {
      todayShifts: today,
      upcomingShifts: upcoming,
      pastShifts: past,
    };
  }, [schedules]);

  const openShiftDetail = async (shiftId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:5000/api/nurses/schedules/${shiftId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (res.ok) {
        setSelectedShift(data.detail);
        setShowModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" />
        <p className="mt-2">Đang tải lịch làm việc...</p>
      </div>
    );
  }

  const renderShiftCard = (s, highlight = false) => (
    <Card
      key={s.shiftId}
      className={`mb-3 shadow-sm ${
        highlight ? "border-primary" : "border-light"
      }`}
    >
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h5 className="mb-1">
              {new Date(s.workDate).toLocaleDateString()}
            </h5>
            <div className="text-muted">
              ⏰ {s.startTime} – {s.endTime}
            </div>
            <div className="mt-2">
              👨‍⚕️ <strong>{s.doctorName}</strong>
            </div>
            <div>🏥 Phòng: {s.roomName || "-"}</div>
          </div>

          <div className="text-end">
            <Badge bg={highlight ? "primary" : "secondary"}>{s.status}</Badge>
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline-primary"
                onClick={() => openShiftDetail(s.shiftId)}
              >
                Chi tiết
              </Button>
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );

  return (
    <div className="container mt-4">
      <h3 className="mb-4">🩺 Lịch làm việc của tôi</h3>

      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-3"
      >
        <Tab eventKey="today" title={`Hôm nay (${todayShifts.length})`}>
          {todayShifts.length === 0 ? (
            <p>Hôm nay bạn không có ca nào.</p>
          ) : (
            todayShifts.map((s) => renderShiftCard(s, true))
          )}
        </Tab>

        <Tab eventKey="upcoming" title={`Sắp tới (${upcomingShifts.length})`}>
          {upcomingShifts.length === 0 ? (
            <p>Không có ca sắp tới.</p>
          ) : (
            upcomingShifts.map((s) => renderShiftCard(s, false))
          )}
        </Tab>

        <Tab eventKey="past" title={`Đã qua (${pastShifts.length})`}>
          {pastShifts.length === 0 ? (
            <p>Chưa có ca nào đã qua.</p>
          ) : (
            pastShifts.map((s) => renderShiftCard(s, false))
          )}
        </Tab>
      </Tabs>

      {/* MODAL CHI TIẾT */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Chi tiết ca trực</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedShift ? (
            <>
              <p>
                <strong>Bác sĩ:</strong> {selectedShift.doctorName}
              </p>
              <p>
                <strong>Phòng:</strong> {selectedShift.roomName}
              </p>
              <p>
                <strong>Ngày:</strong>{" "}
                {new Date(selectedShift.workDate).toLocaleDateString()}
              </p>
              <p>
                <strong>Giờ:</strong> {selectedShift.startTime} –{" "}
                {selectedShift.endTime}
              </p>
              <p>
                <strong>Trạng thái:</strong> {selectedShift.nurseShiftStatus}
              </p>
            </>
          ) : (
            <p>Đang tải...</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
