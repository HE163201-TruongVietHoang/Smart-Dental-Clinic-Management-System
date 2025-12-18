import React, { useEffect, useState } from "react";
import Header from "../../components/home/Header/Header";
import Footer from "../../components/home/Footer/Footer";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [visibleCount, setVisibleCount] = useState(9);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const API_URL = "http://localhost:5000/api/services";

  // --- Lấy dữ liệu từ backend ---
  const fetchServices = async () => {
    try {
      const res = await axios.get(API_URL);
      if (Array.isArray(res.data)) {
        setServices(res.data);
      } else if (res.data.services) {
        setServices(res.data.services);
      } else {
        throw new Error("Dữ liệu không hợp lệ từ server");
      }
    } catch (err) {
      console.error("❌ Lỗi khi tải dịch vụ:", err);
      setError("Không thể tải danh sách dịch vụ. Vui lòng thử lại sau!");
    } finally {
      setLoading(false);
    }
  };

  const normalizeText = (str) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase();
  };
  const filterByPrice = (price) => {
    if (priceFilter === "all") return true;

    const value = Number(price);

    switch (priceFilter) {
      case "0-500":
        return value <= 500000;
      case "500-2000":
        return value >= 500000 && value <= 2000000;
      case "2000-5000":
        return value >= 2000000 && value <= 5000000;
      case "5000-20000":
        return value >= 5000000 && value <= 20000000;
      case "20000+":
        return value >= 20000000;
      default:
        return true;
    }
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [priceFilter, setPriceFilter] = useState("all");

  // Filter theo tên dịch vụ
  const filteredServices = services
    .filter((s) =>
      normalizeText(s.serviceName).includes(normalizeText(searchTerm))
    )
    .filter((s) => filterByPrice(s.price));

  useEffect(() => {
    fetchServices();
  }, []);

  const handleLoadMore = () =>
    setVisibleCount((prev) => Math.min(prev + 9, services.length));
  const handleCollapse = () => setVisibleCount((prev) => Math.max(prev - 9, 9));

  const formatPrice = (price) =>
    Number(price).toLocaleString("vi-VN", {
      style: "currency",
      currency: "VND",
    });

  return (
    <div>
      <Header />

      <section className="py-5" style={{ backgroundColor: "#fff" }}>
        <div className="container-lg">
          <div className="text-center mb-3">
            <h2 className="fw-bold mb-3" style={{ color: "#2ECCB6" }}>
              Các dịch vụ tại phòng khám
            </h2>
            <p className="text-muted lead">
              Chúng tôi cung cấp đầy đủ các dịch vụ nha khoa hiện đại, an toàn
              và tận tâm cho bạn và gia đình.
            </p>
          </div>
          <div className="mb-3 d-flex justify-content-end gap-2">
            {/* Tìm kiếm */}
            <input
              type="text"
              className="form-control"
              placeholder="Tìm kiếm dịch vụ..."
              style={{ maxWidth: "300px" }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* Lọc theo giá */}
            <select
              className="form-select"
              style={{ maxWidth: "200px" }}
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
            >
              <option value="all">Tất cả giá</option>
              <option value="0-500">0 - 500k</option>
              <option value="500-2000">500k - 2 triệu</option>
              <option value="2000-5000">2 triệu - 5 triệu</option>
              <option value="5000-20000">5 triệu - 20 triệu</option>
              <option value="20000+">Trên 20 triệu</option>
            </select>
          </div>

          {loading && (
            <div className="text-center my-5">
              <div className="spinner-border text-success" role="status">
                <span className="visually-hidden">Đang tải...</span>
              </div>
              <p className="mt-3 text-muted">Đang tải danh sách dịch vụ...</p>
            </div>
          )}

          {error && (
            <div className="alert alert-danger text-center" role="alert">
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              {services.length === 0 ? (
                <div className="text-center text-muted">
                  <p>Không có dịch vụ nào để hiển thị.</p>
                </div>
              ) : (
                <div className="row g-4">
                  {filteredServices.slice(0, visibleCount).map((s) => (
                    <div key={s.serviceId} className="col-md-6 col-lg-4">
                      <div
                        className="card border-0 shadow-sm h-100 text-center p-4"
                        style={{
                          borderRadius: "15px",
                          cursor: "pointer",
                          transition:
                            "transform 0.3s ease, box-shadow 0.3s ease",
                        }}
                        onClick={() => navigate(`/service/${s.serviceId}`)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-5px)";
                          e.currentTarget.style.boxShadow =
                            "0 8px 20px rgba(46, 204, 182, 0.3)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow =
                            "0 4px 12px rgba(0,0,0,0.05)";
                        }}
                      >
                        {/* IMAGE */}
                        <div className="mb-3">
                          <img
                            src={
                              s.imageUrl ||
                              "https://via.placeholder.com/120?text=Service"
                            }
                            alt={s.serviceName}
                            className="img-fluid"
                            style={{
                              width: "120px",
                              height: "120px",
                              objectFit: "cover",
                              borderRadius: "15px",
                              margin: "0 auto",
                            }}
                          />
                        </div>

                        {/* Name */}
                        <h5 className="fw-bold mb-2">{s.serviceName}</h5>

                        {/* Description */}
                        <p
                          className="text-muted small"
                          style={{
                            whiteSpace: "pre-line",
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {s.description}
                        </p>

                        {/* Price */}
                        {s.price !== null && s.price !== undefined && (
                          <p className="fw-semibold">{formatPrice(s.price)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Load More / Collapse */}
          {!loading && !error && filteredServices.length > 9 && (
            <div className="d-flex justify-content-center align-items-center mt-4 gap-2">
              {visibleCount < services.length && (
                <button
                  className="btn btn-outline-secondary"
                  onClick={handleLoadMore}
                >
                  Tải thêm
                </button>
              )}
              {visibleCount > 9 && (
                <button
                  className="btn btn-outline-secondary"
                  onClick={handleCollapse}
                >
                  Thu gọn
                </button>
              )}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}
