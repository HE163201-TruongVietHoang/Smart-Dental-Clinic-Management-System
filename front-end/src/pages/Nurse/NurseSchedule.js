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

  /* ================= FETCH ================= */
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

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.schedules)
        ? data.schedules
        : [];

      setSchedules(list);
    } catch (err) {
      console.error(err);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  /* ================= DATE UTILS ================= */
  const getLocalDateStr = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const parseTimeToMinutes = (timeStr) => {
    const m = String(timeStr).match(/(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  };

  const nowMinutes = () => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  };

  /* ================= PHÂN TAB ================= */
  const { pastShifts, todayShifts, next3DaysShifts } = useMemo(() => {
    const todayStr = getLocalDateStr();

    const next3 = new Date(todayStr);
    next3.setDate(next3.getDate() + 7);
    const next3Str = getLocalDateStr(next3);

    const past = [];
    const today = [];
    const next = [];

    schedules.forEach((s) => {
      const d = String(s.workDate).split("T")[0];
      if (d < todayStr) past.push(s);
      else if (d === todayStr) today.push(s);
      else if (d <= next3Str) next.push(s);
    });

    const sortAsc = (a, b) =>
      a.workDate.localeCompare(b.workDate) ||
      a.startTime.localeCompare(b.startTime);

    const sortDesc = (a, b) =>
      b.workDate.localeCompare(a.workDate) ||
      b.startTime.localeCompare(a.startTime);

    past.sort(sortDesc);
    today.sort(sortAsc);
    next.sort(sortAsc);

    return {
      pastShifts: past,
      todayShifts: today,
      next3DaysShifts: next,
    };
  }, [schedules]);

  /* ================= BADGE + HIGHLIGHT ================= */
  const getTodayShiftMeta = (shift) => {
    const start = parseTimeToMinutes(shift.startTime);
    const end = parseTimeToMinutes(shift.endTime);
    const now = nowMinutes();

    if (start == null || end == null)
      return { label: "", variant: "secondary" };

    if (now < start)
      return { label: "Sắp tới", variant: "warning", diff: start - now };

    if (now > end)
      return { label: "Đã xong", variant: "secondary", diff: now - end };

    return { label: "Đang diễn ra", variant: "success", diff: 0 };
  };

  const highlightedShiftId = useMemo(() => {
    const metas = todayShifts.map((s) => ({
      shiftId: s.shiftId,
      ...getTodayShiftMeta(s),
    }));

    // ưu tiên đang diễn ra
    const ongoing = metas.find((m) => m.label === "Đang diễn ra");
    if (ongoing) return ongoing.shiftId;

    // nếu không có → ca sắp tới gần nhất
    const upcoming = metas
      .filter((m) => m.label === "Sắp tới")
      .sort((a, b) => a.diff - b.diff)[0];

    return upcoming?.shiftId || null;
  }, [todayShifts]);

  /* ================= DETAIL ================= */
  const openShiftDetail = async (shiftId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:5000/api/nurses/schedules/${shiftId}`,
        { headers: { Authorization: `Bearer ${token}` } }
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

  /* ================= CARD ================= */
  const renderShiftCard = (s, highlight = false, showTodayBadge = false) => {
    const meta = showTodayBadge ? getTodayShiftMeta(s) : null;

    return (
      <Card
        key={s.shiftId}
        className={`mb-3 shadow-sm ${
          highlight ? "border-success border-2" : "border-light"
        }`}
      >
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <h5 className="mb-1">
                Ngày:
                {new Date(String(s.workDate).split("T")[0]).toLocaleDateString(
                  "vi-VN"
                )}
              </h5>
              <div className="text-muted">
                giờ: {String(s.startTime).slice(0, 5)} –{" "}
                {String(s.endTime).slice(0, 5)}
              </div>
              <div className="mt-2">
                Bác sĩ: <strong>{s.doctorName}</strong>
              </div>
              <div>Phòng: {s.roomName || "-"}</div>
            </div>

            <div className="text-end">
              {showTodayBadge && (
                <Badge bg={meta.variant} className="mb-2">
                  {meta.label}
                </Badge>
              )}
            </div>
          </div>
        </Card.Body>
      </Card>
    );
  };

  /* ================= UI ================= */
  return (
    <div className="container mt-4">
      <h3 className="mb-4"> Lịch làm việc của tôi</h3>

      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-3"
      >
        <Tab eventKey="today" title={`Hôm nay (${todayShifts.length})`}>
          {todayShifts.length === 0 ? (
            <p>Hôm nay bạn không có ca nào.</p>
          ) : (
            todayShifts.map((s) =>
              renderShiftCard(s, s.shiftId === highlightedShiftId, true)
            )
          )}
        </Tab>

        <Tab eventKey="next3" title={`7 ngày tới (${next3DaysShifts.length})`}>
          {next3DaysShifts.length === 0 ? (
            <p>Không có ca trong 7 ngày tới.</p>
          ) : (
            next3DaysShifts.map((s) => renderShiftCard(s))
          )}
        </Tab>

        <Tab eventKey="past" title={`Đã qua (${pastShifts.length})`}>
          {pastShifts.length === 0 ? (
            <p>Chưa có ca nào đã qua.</p>
          ) : (
            pastShifts.map((s) => renderShiftCard(s))
          )}
        </Tab>
      </Tabs>

      {/* ================= MODAL ================= */}
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
                {new Date(
                  String(selectedShift.workDate).split("T")[0]
                ).toLocaleDateString("vi-VN")}
              </p>
              <p>
                <strong>Giờ:</strong>{" "}
                {String(selectedShift.startTime).slice(0, 5)} –{" "}
                {String(selectedShift.endTime).slice(0, 5)}
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
