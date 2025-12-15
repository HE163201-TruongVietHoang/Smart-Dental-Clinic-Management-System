import Header from "../components/home/Header/Header";
import Footer from "../components/home/Footer/Footer";
import Feedback from "../components/home/Feedback/Feedback";
import Slider from "react-slick";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useState } from "react";

export default function Home() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const isLoggedIn = !!localStorage.getItem("token");

  useEffect(() => {
    fetch("http://localhost:5000/api/services") // đổi đúng port API của bạn
      .then((res) => res.json())
      .then((data) => setServices(data))
      .catch((err) => console.error("Error fetching services:", err));
  }, []);
  return (
    <div>
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section
        className="hero-section py-5 py-md-6"
        style={{ backgroundColor: "#f0fffa" }}
      >
        <div className="container-lg">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <h1 className="display-4 fw-bold mb-4 text-dark">
                Nụ cười khỏe mạnh, cuộc sống tươi sáng
              </h1>
              <p className="lead text-muted mb-4">
                Dịch vụ nha khoa tận tâm với công nghệ hiện đại và đội ngũ
                chuyên nghiệp.
              </p>
              <div className="d-flex gap-3 flex-wrap">
                <button
                  className="btn btn-lg px-4"
                  style={{
                    backgroundColor: "#2ECCB6",
                    borderColor: "#2ECCB6",
                    color: "#fff",
                    transition: "0.3s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#43675bff"; // màu hover
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#2ECCB6"; // màu gốc
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

                {!isLoggedIn && (
                  <button
                    className="btn btn-lg px-4"
                    style={{
                      borderColor: "#2ECCB6",
                      color: "#2ECCB6",
                      backgroundColor: "transparent",
                      transition: "0.3s",
                    }}
                    onClick={() => navigate("/signup")}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#43675bff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    Đăng ký ngay
                  </button>
                )}
              </div>
            </div>
            {/* Ảnh */}
            {/* <div className="col-lg-6 text-center">
              <img
                src="/images/home/1.jpg"
                alt="Phòng khám nha khoa hiện đại"
                className="img-fluid rounded-3 shadow-sm"
                style={{ maxHeight: "480px", objectFit: "cover" }}
              />
            </div> */}
            <div className="col-lg-6 text-center">
              <Slider
                dots={true}
                infinite={true}
                autoplay={true}
                autoplaySpeed={2000}
                speed={800}
                slidesToShow={1}
                slidesToScroll={1}
                arrows={false}
              >
                {[
                  "/images/home/1.jpg",
                  "/images/home/2.jpg",
                  "/images/home/5.jpg",
                  "/images/home/4.jpg",
                ].map((src, i) => (
                  <div key={i}>
                    <img
                      src={src}
                      alt={`Ảnh phòng khám ${i + 1}`}
                      className="img-fluid rounded-3 shadow-sm"
                      style={{
                        maxHeight: "480px",
                        objectFit: "cover",
                        width: "100%",
                        borderRadius: "15px",
                      }}
                    />
                  </div>
                ))}
              </Slider>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-5" style={{ backgroundColor: "#fff" }}>
        <div className="container-lg">
          <div className="text-center mb-5">
            <h2 className="fw-bold mb-3" style={{ color: "#2ECCB6" }}>
              Dịch vụ nổi bật của chúng tôi
            </h2>
            <p className="text-muted lead">
              Mang đến cho bạn trải nghiệm nha khoa an toàn, hiện đại và tận
              tâm.
            </p>
          </div>

          <div className="row g-4">
            {services.slice(5, 8).map((s) => (
              <div key={s.serviceId} className="col-md-6 col-lg-4">
                <div
                  className="card border-0 shadow-sm h-100 text-center p-4"
                  style={{
                    borderRadius: "15px",
                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
                    cursor: "pointer",
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
                      src={s.imageUrl || "https://via.placeholder.com/80"} // fallback nếu chưa có ảnh
                      alt={s.serviceName}
                      className="img-fluid"
                      style={{
                        width: "80px",
                        height: "80px",
                        objectFit: "cover",
                        borderRadius: "50%",
                        margin: "0 auto",
                      }}
                    />
                  </div>

                  {/* Name */}
                  <h5 className="fw-bold mb-2">{s.serviceName}</h5>

                  {/* Description */}
                  {/* <p className="text-muted small">
              {s.description?.slice(0, 80)}...
            </p> */}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section
        className="py-5"
        style={{ backgroundColor: "#f0fffa", borderTop: "1px solid #e5e5e5" }}
      >
        <div className="container-lg">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <img
                src="/images/home/3.jpg"
                alt="Đội ngũ bác sĩ nha khoa"
                className="img-fluid rounded-3 shadow-sm"
              />
            </div>
            <div className="col-lg-6">
              <h2 className="fw-bold mb-3" style={{ color: "#2ECCB6" }}>
                Tận tâm – Chuyên nghiệp – Hiện đại
              </h2>
              <p className="text-muted mb-4">
                Chúng tôi luôn đặt sức khỏe răng miệng và sự hài lòng của bạn
                lên hàng đầu, với đội ngũ chuyên gia giàu kinh nghiệm cùng trang
                thiết bị hiện đại.
              </p>
              <ul className="list-unstyled text-muted">
                <li className="mb-2">
                  <i
                    className="fas fa-check-circle me-2"
                    style={{ color: "#2ECCB6" }}
                  ></i>
                  Trang thiết bị chuẩn quốc tế
                </li>
                <li className="mb-2">
                  <i
                    className="fas fa-check-circle me-2"
                    style={{ color: "#2ECCB6" }}
                  ></i>
                  Bác sĩ nhiều năm kinh nghiệm
                </li>
                <li>
                  <i
                    className="fas fa-check-circle me-2"
                    style={{ color: "#2ECCB6" }}
                  ></i>
                  Dịch vụ tận tâm – chuyên nghiệp
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feedback Section */}
      <Feedback />

      {/* CTA Section */}
      <section
        className="py-5 text-white text-center"
        style={{ backgroundColor: "#2ECCB6" }}
      >
        <div className="container-lg">
          <h2 className="display-6 fw-bold mb-3">
            Sẵn sàng cho nụ cười tươi sáng?
          </h2>
          <p className="lead mb-4">
            Liên hệ với chúng tôi ngay hôm nay để đặt lịch khám miễn phí.
          </p>
          <button
            className="btn btn-lg px-4"
            style={{
              backgroundColor: "#fff",
              borderColor: "#2ECCB6",
              color: "#2ECCB6",
            }}
            onClick={() => {
              const token = localStorage.getItem("token");

              if (!token) {
                navigate("/signin", { state: { redirectTo: "/appointment" } });
                return;
              }

              navigate("/appointment");
            }}
          >
            Đặt lịch ngay
          </button>
        </div>
      </section>

      {/* Contact Section */}
      <section
        id="contact"
        className="py-5"
        style={{ backgroundColor: "#f0fffa", borderTop: "1px solid #e5e5e5" }}
      >
        <div className="container-lg">
          <div className="text-center mb-5">
            <h2 className="fw-bold mb-3" style={{ color: "#2ECCB6" }}>
              Liên hệ với chúng tôi
            </h2>
            <p className="text-muted lead">
              Chúng tôi luôn sẵn sàng hỗ trợ bạn mọi lúc, mọi nơi.
            </p>
          </div>

          <div className="row g-4">
            {[
              {
                icon: "fa-phone",
                title: "Điện thoại",
                text: "(+84) 981 226 816",
              },
              {
                icon: "fa-map-marker-alt",
                title: "Địa chỉ",
                text: "123 Hoà Lạc, TP.Hà Nội",
              },
              {
                icon: "fa-envelope",
                title: "Email",
                text: "sdcms@gmail.com",
              },
            ].map((item, i) => (
              <div key={i} className="col-md-6 col-lg-4">
                <div
                  className="card h-100 border-0 shadow-sm text-center p-4"
                  style={{
                    borderRadius: "15px",
                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  }}
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
                  <div
                    className="d-flex align-items-center justify-content-center mb-3"
                    style={{
                      width: "70px",
                      height: "70px",
                      margin: "0 auto",
                      borderRadius: "50%",
                      backgroundColor: "#E8FAF6",
                    }}
                  >
                    <i
                      className={`fas ${item.icon}`}
                      style={{ color: "#2ECCB6", fontSize: "2rem" }}
                    ></i>
                  </div>
                  <h5 className="fw-bold mb-2">{item.title}</h5>
                  <p className="text-muted small mb-0">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
