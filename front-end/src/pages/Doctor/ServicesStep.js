import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

const API_BASE = "http://localhost:5000";
const PAGE_SIZE = 12;

/* ========= helpers ========= */
const ssKey = (appointmentId) => `diag_wizard_${appointmentId}`;
const safeParse = (s, fb) => {
  try {
    return JSON.parse(s);
  } catch {
    return fb;
  }
};

export default function ServicesStep() {
  const navigate = useNavigate();
  const { appointmentId } = useParams();
  const apptId = Number(appointmentId);
  const token = localStorage.getItem("token");

  /* ========= state ========= */
  const [allServices, setAllServices] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [selectedServices, setSelectedServices] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  /* ========= load draft ========= */
  const draft = useMemo(
    () => safeParse(sessionStorage.getItem(ssKey(apptId)) || "null", null),
    [apptId]
  );

  /* ========= GUARD 1: CHƯA CHẨN ĐOÁN → KHÔNG CHO VÀO SERVICES ========= */
  useEffect(() => {
    if (!draft?.diagnosis?.diagnosisResult) {
      toast.warning("Vui lòng hoàn tất chẩn đoán trước khi chọn dịch vụ");
      navigate(`/doctor/diagnosis/${apptId}`);
    }
  }, [draft, apptId, navigate]);

  /* ========= fetch ========= */
  const fetchJson = async (url) => {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error();
    return res.json();
  };

  useEffect(() => {
    if (!token) return;

    (async () => {
      try {
        const services = await fetchJson(`${API_BASE}/api/services`);
        setAllServices(Array.isArray(services) ? services : []);
      } catch {
        toast.error("Không tải được danh sách dịch vụ");
      }

      try {
        const appts = await fetchJson(`${API_BASE}/api/diagnoses/appointments`);
        setAppointments(Array.isArray(appts) ? appts : []);
      } catch {}
    })();

    if (Array.isArray(draft?.services)) {
      setSelectedServices(draft.services);
    }
  }, [token]); // eslint-disable-line

  /* ========= derived ========= */
  const selectedAppointment = useMemo(
    () => appointments.find((a) => a.appointmentId === apptId),
    [appointments, apptId]
  );

  const categories = useMemo(() => {
    const set = new Set(allServices.map((s) => s.category).filter(Boolean));
    return Array.from(set);
  }, [allServices]);

  const frequentServiceIds = [1, 2, 3, 5, 8];
  const frequentServices = useMemo(
    () => allServices.filter((s) => frequentServiceIds.includes(s.serviceId)),
    [allServices]
  );

  const filteredServices = useMemo(() => {
    return allServices.filter((s) => {
      const matchName = s.serviceName
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchCategory = !category || s.category === category;
      return matchName && matchCategory;
    });
  }, [allServices, search, category]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, category]);

  /* ========= actions ========= */
  const toggleService = (id) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  /* ========= GUARD 2: CHƯA CHỌN SERVICE → KHÔNG CHO KÊ ĐƠN ========= */
  const saveAndNext = () => {
    if (!selectedServices || selectedServices.length === 0) {
      toast.warning("Phải chọn ít nhất 1 dịch vụ trước khi kê đơn");
      return;
    }

    const next = {
      ...draft,
      services: selectedServices,
      updatedAt: Date.now(),
    };

    sessionStorage.setItem(ssKey(apptId), JSON.stringify(next));
    navigate(`/doctor/diagnosis/${apptId}/prescription`);
  };

  const formatTime = (t) =>
    t ? String(t).split(":").slice(0, 2).join(":") : "";

  /* ========= UI ========= */
  return (
    <div style={wrap}>
      <div style={card}>
        <h2 style={title}>Chọn dịch vụ</h2>
        <p style={sub}>Bắt buộc phải có chẩn đoán & chọn ít nhất 1 dịch vụ</p>

        {selectedAppointment && (
          <div style={infoBox}>
            <div>
              <b>Ca:</b> #{selectedAppointment.appointmentId} ·{" "}
              {selectedAppointment.patientName}
            </div>
            <div>
              <b>Giờ:</b> {formatTime(selectedAppointment.startTime)} -{" "}
              {formatTime(selectedAppointment.endTime)}
            </div>
            <div>
              <b>Kết luận:</b> {draft?.diagnosis?.diagnosisResult}
            </div>
          </div>
        )}

        {/* SEARCH + FILTER */}
        <div style={toolbar}>
          <input
            style={searchBox}
            placeholder="🔍 Tìm dịch vụ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* FREQUENT */}
        {frequentServices.length > 0 && (
          <>
            <h4 style={sectionTitle}>Dịch vụ hay dùng</h4>
            <div style={serviceGrid}>
              {frequentServices.map((s) => (
                <ServiceItem
                  key={s.serviceId}
                  service={s}
                  selected={selectedServices.includes(s.serviceId)}
                  onToggle={toggleService}
                />
              ))}
            </div>
          </>
        )}

        {/* ALL SERVICES */}
        <h4 style={sectionTitle}>Tất cả dịch vụ</h4>
        <div style={serviceGrid}>
          {filteredServices.slice(0, visibleCount).map((s) => (
            <ServiceItem
              key={s.serviceId}
              service={s}
              selected={selectedServices.includes(s.serviceId)}
              onToggle={toggleService}
            />
          ))}
        </div>

        {filteredServices.length > PAGE_SIZE && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            {visibleCount < filteredServices.length ? (
              <button
                style={moreBtn}
                onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
              >
                Xem thêm
              </button>
            ) : (
              <button
                style={lessBtn}
                onClick={() => setVisibleCount(PAGE_SIZE)}
              >
                Thu gọn
              </button>
            )}
          </div>
        )}

        <p style={{ marginTop: 10, fontWeight: 600 }}>
          Đã chọn {selectedServices.length} dịch vụ
        </p>

        <div style={actions}>
          <button
            style={ghost}
            onClick={() => navigate(`/doctor/diagnosis/${apptId}`)}
          >
            ← Quay lại chẩn đoán
          </button>

          <button
            style={{
              ...primary,
              opacity: selectedServices.length === 0 ? 0.6 : 1,
              cursor: selectedServices.length === 0 ? "not-allowed" : "pointer",
            }}
            disabled={selectedServices.length === 0}
            onClick={saveAndNext}
          >
            Tiếp tục kê đơn →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========= SUB ========= */
function ServiceItem({ service, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(service.serviceId)}
      style={{
        ...serviceItem,
        borderColor: selected ? "#22c7a9" : "#e5e7eb",
        background: selected ? "#c8f3eb" : "#fff",
      }}
    >
      <div style={{ fontWeight: 700 }}>{service.serviceName}</div>
      <div style={meta}>
        {service.category || "Chưa phân loại"} ·{" "}
        {typeof service.price === "number"
          ? service.price.toLocaleString("vi-VN") + " đ"
          : ""}
      </div>
    </button>
  );
}

/* ========= STYLES ========= */
const wrap = { minHeight: "100vh", padding: 24, background: "#f6fffd" };
const card = {
  maxWidth: 1000,
  margin: "0 auto",
  background: "#fff",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 6px 18px rgba(0,0,0,.08)",
};
const title = { margin: 0 };
const sub = { marginTop: 6, color: "#6b7280" };
const infoBox = {
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  background: "#ecfbf8",
  border: "1px solid #dff5f0",
};
const toolbar = {
  marginTop: 16,
  display: "grid",
  gridTemplateColumns: "1fr 220px",
  gap: 10,
};
const searchBox = {
  padding: 12,
  borderRadius: 10,
  border: "2px solid #22c7a9",
};
const select = {
  padding: 12,
  borderRadius: 10,
  border: "2px solid #22c7a9",
};
const sectionTitle = { marginTop: 20, marginBottom: 10 };
const serviceGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: 12,
};
const serviceItem = {
  padding: 14,
  borderRadius: 14,
  border: "2px solid",
  textAlign: "left",
  cursor: "pointer",
};
const meta = { fontSize: 12, color: "#6b7280", marginTop: 4 };
const actions = {
  marginTop: 20,
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
};
const primary = {
  padding: "12px 16px",
  borderRadius: 12,
  background: "#10b981",
  color: "#fff",
  fontWeight: 700,
  border: "none",
  cursor: "pointer",
};
const ghost = {
  padding: "12px 16px",
  borderRadius: 12,
  background: "#f3f4f6",
  color: "#111827",
  fontWeight: 700,
  border: "none",
  cursor: "pointer",
};
const moreBtn = {
  padding: "10px 16px",
  borderRadius: 12,
  background: "#e0f7f4",
  border: "2px solid #22c7a9",
  color: "#065f46",
  fontWeight: 700,
  cursor: "pointer",
};
const lessBtn = {
  ...moreBtn,
  background: "#f3f4f6",
  border: "2px solid #d1d5db",
  color: "#374151",
};
