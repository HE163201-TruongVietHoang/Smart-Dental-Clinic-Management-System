import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/home/Header/Header";
import Footer from "../../components/home/Footer/Footer";

export default function ServiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:5000/api/services/${id}`)
      .then((res) => res.json())
      .then((data) => setService(data))
      .catch((err) => console.error("Error loading service detail:", err));
  }, [id]);

  if (!service) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-success"></div>
        <p className="mt-3">Đang tải dữ liệu dịch vụ...</p>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="container py-5" style={{ maxWidth: "900px" }}>
        {/* Back button */}
        <button
          className="btn btn-outline-success mb-4"
          onClick={() => navigate(-1)}
          style={{ borderRadius: "10px" }}
        >
          ← Quay lại
        </button>

        {/* Card Detail */}
        <div
          className="p-4 shadow-sm"
          style={{
            borderRadius: "18px",
            backgroundColor: "#fff",
            border: "1px solid #f0f0f0",
          }}
        >
          {/* IMAGE */}
          <div className="text-center mb-4">
            <img
              src={
                service.imageUrl ||
                "https://via.placeholder.com/120?text=Service"
              }
              alt={service.serviceName}
              className="img-fluid"
              style={{
                width: "150px",
                height: "150px",
                objectFit: "cover",
                borderRadius: "15px",
              }}
            />
          </div>

          {/* Title */}
          <h2 className="fw-bold text-center mb-3" style={{ color: "#2ECCB6" }}>
            {service.serviceName}
          </h2>

          {/* Description */}
          <div className="text-muted small" style={{ whiteSpace: "pre-line" }}>
            {service.description}
          </div>

          <div className="row mt-4">
            {/* Price */}
            <div className="col-md-6 mb-3">
              <div
                className="p-3 h-100 shadow-sm"
                style={{
                  borderRadius: "15px",
                  backgroundColor: "#f9fdfa",
                  border: "1px solid #e2f7f2",
                }}
              >
                <h6 className="text-success mb-1">Giá dịch vụ</h6>
                <p className="fw-bold fs-5 mb-0">
                  {service.price?.toLocaleString()} đ
                </p>
              </div>
            </div>

            {/* Duration */}
            <div className="col-md-6 mb-3">
              <div
                className="p-3 h-100 shadow-sm"
                style={{
                  borderRadius: "15px",
                  backgroundColor: "#f9fdfa",
                  border: "1px solid #e2f7f2",
                }}
              >
                <h6 className="text-success mb-1">Thời gian</h6>
                <p className="fw-bold fs-5 mb-0">{service.duration} ngày</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-5">
            <button
              className="btn btn-lg px-4"
              style={{
                backgroundColor: "#2ECCB6",
                borderColor: "#2ECCB6",
                color: "#fff",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#27b59b";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#2ECCB6";
              }}
              onClick={() => {
                const token = localStorage.getItem("token");

                if (!token) {
                  navigate("/signin", {
                    state: { redirectTo: "/appointment" },
                  });
                  return;
                }

                navigate("/appointment");
              }}
            >
              Đặt lịch ngay
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
