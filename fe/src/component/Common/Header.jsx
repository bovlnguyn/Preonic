import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../../assets/branding/preonic-logo-main.png";
import { useAuth } from "../../contexts/AuthContext";
import "./Header.css";

const NAV_ITEMS = [
  { label: "Trang chủ", path: "/" },
  { label: "Sản phẩm", path: "/products" },
  { label: "Giải pháp", path: "/solutions" },
  { label: "Liên hệ", path: "/contact" },
  { label: "AI nông nghiệp", path: "/ai-agriculture", highlight: true },
];

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();

  const user = auth?.user;
  const logout = auth?.logout;

  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const isLoggedIn = Boolean(user);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMenu = () => setOpen(false);

  const handleNavigate = (path) => {
    closeMenu();
    navigate(path);
  };

  const handleLogout = async () => {
    if (logout) {
      await logout();
    }

    closeMenu();
    navigate("/");
  };

  return (
    <motion.header
      className={`preonic-header ${scrolled ? "preonic-header--scrolled" : ""}`}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      <div className="preonic-header__bg" />

      <div className="preonic-header__container">
        <Link to="/" className="preonic-header__brand" onClick={closeMenu}>
          <span className="preonic-header__logo-shell">
            <span className="preonic-header__logo-glow" />

            {!logoError ? (
              <img
                src={logo}
                alt="PreOnic"
                className="preonic-header__logo"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="preonic-header__logo-fallback">P</span>
            )}
          </span>

          <span className="preonic-header__brand-copy">
            <span className="preonic-header__brand-name">PreOnic</span>
            <span className="preonic-header__brand-tagline">Nông nghiệp số</span>
          </span>
        </Link>

        <nav className="preonic-header__nav" aria-label="Menu chính">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;

            return (
              <button
                type="button"
                key={item.path}
                className={[
                  "preonic-header__link",
                  active ? "active" : "",
                  item.highlight ? "preonic-header__link--ai" : "",
                ].join(" ")}
                onClick={() => handleNavigate(item.path)}
              >
                {item.highlight && <span className="preonic-header__ai-dot" />}
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="preonic-header__actions">
          {isLoggedIn ? (
            <button
              type="button"
              className="preonic-header__register"
              onClick={handleLogout}
            >
              Đăng xuất
            </button>
          ) : (
            <>
              <button
                type="button"
                className="preonic-header__login"
                onClick={() => handleNavigate("/login")}
              >
                Đăng nhập
              </button>

              <button
                type="button"
                className="preonic-header__register"
                onClick={() => handleNavigate("/register")}
              >
                Đăng ký
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          className={`preonic-header__toggle ${open ? "open" : ""}`}
          onClick={() => setOpen((value) => !value)}
          aria-label="Mở menu"
          aria-expanded={open}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="preonic-header__mobile"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <div className="preonic-header__mobile-inner">
              {NAV_ITEMS.map((item) => (
                <button
                  type="button"
                  key={item.path}
                  className={[
                    location.pathname === item.path ? "active" : "",
                    item.highlight ? "mobile-ai" : "",
                  ].join(" ")}
                  onClick={() => handleNavigate(item.path)}
                >
                  {item.label}
                </button>
              ))}

              <div className="preonic-header__mobile-actions">
                {isLoggedIn ? (
                  <button type="button" onClick={handleLogout}>
                    Đăng xuất
                  </button>
                ) : (
                  <>
                    <button type="button" onClick={() => handleNavigate("/login")}>
                      Đăng nhập
                    </button>

                    <button type="button" onClick={() => handleNavigate("/register")}>
                      Đăng ký
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

export default Header;