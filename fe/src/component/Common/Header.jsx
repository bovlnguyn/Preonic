import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import {
  FiAlertTriangle,
  FiChevronDown,
  FiGrid,
  FiHome,
  FiLogOut,
  FiUser,
} from "react-icons/fi";
import logo from "../../assets/branding/preonic-logo-main.png";
import { useAuth } from "../../contexts/AuthContext";
import { resolveImageUrl } from "../../services/product.service";
import "./Header.css";

const GUEST_NAV_ITEMS = [
  { label: "Trang chủ", path: "/" },
  { label: "Sản phẩm", path: "/products" },
  { label: "Giải pháp", path: "/solutions" },
  { label: "Liên hệ", path: "/contact" },
  { label: "AI nông nghiệp", path: "/ai-agriculture", highlight: true },
];

const FARMER_NAV_ITEMS = [
  { label: "Trang chủ", path: "/farmer-home" },
  { label: "Sản phẩm", path: "/farmer-products" },
  { label: "Giải pháp", path: "/farmer-solutions" },
  { label: "Liên hệ", path: "/farmer-contact" },
  { label: "AI nông nghiệp", path: "/farmer-ai-agriculture", highlight: true },
];

const ENTERPRISE_NAV_ITEMS = [
  { label: "Trang chủ", path: "/enterprise-home" },
  { label: "Sản phẩm", path: "/enterprise-products" },
  { label: "Giải pháp", path: "/enterprise-solutions" },
  { label: "Liên hệ", path: "/enterprise-contact" },
  { label: "AI thu mua", path: "/enterprise-ai-agriculture", highlight: true },
];

const ROLE_HOME_PATH = {
  farmer: "/farmer-home",
  enterprise: "/enterprise-home",
  admin: "/admin",
};

const ROLE_DASHBOARD_PATH = {
  farmer: "/farmer",
  enterprise: "/enterprise",
  admin: "/admin",
};

const ROLE_LABEL = {
  farmer: "Farmer",
  enterprise: "Enterprise",
  admin: "Admin",
};

const ROLE_TAGLINE = {
  farmer: "Farmer workspace",
  enterprise: "Enterprise workspace",
  admin: "Admin workspace",
};

const ROLE_DESCRIPTION = {
  farmer: "Không gian nhà nông",
  enterprise: "Không gian doanh nghiệp",
  admin: "Không gian quản trị",
};

function getDisplayName(user) {
  const joinedName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();

  return (
    user?.fullName?.trim() ||
    joinedName ||
    user?.companyName?.trim() ||
    user?.email ||
    "Người dùng PreOnic"
  );
}

function getGreetingName(user, displayName) {
  if (user?.firstName?.trim()) return user.firstName.trim();

  const words = displayName.trim().split(/\s+/);
  return words[words.length - 1] || "bạn";
}

function getInitials(name = "") {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "PO";

  return words
    .slice(-2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();

  const user = auth?.user;
  const logout = auth?.logout;
  const role = user?.role;

  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const accountRef = useRef(null);

  const isLoggedIn = Boolean(user);

  const navItems = useMemo(() => {
    if (role === "farmer") return FARMER_NAV_ITEMS;
    if (role === "enterprise") return ENTERPRISE_NAV_ITEMS;
    return GUEST_NAV_ITEMS;
  }, [role]);

  const homePath = isLoggedIn ? ROLE_HOME_PATH[role] || "/" : "/";
  const dashboardPath = isLoggedIn ? ROLE_DASHBOARD_PATH[role] : null;
  const roleLabel = ROLE_LABEL[role] || "Dashboard";
  const tagline = isLoggedIn ? ROLE_TAGLINE[role] || "Nông nghiệp số" : "Nông nghiệp số";
  const roleDescription = ROLE_DESCRIPTION[role] || "Tài khoản PreOnic";
  const themeRole = role === "enterprise" ? "enterprise" : role === "farmer" ? "farmer" : "guest";
  const displayName = getDisplayName(user);
  const greetingName = getGreetingName(user, displayName);
  const avatarUrl = resolveImageUrl(user?.avatar);
  const initials = getInitials(displayName);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatar]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setAccountOpen(false);
        setLogoutConfirmOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!logoutConfirmOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [logoutConfirmOpen]);

  const closeMenu = () => {
    setOpen(false);
    setAccountOpen(false);
  };

  const handleNavigate = (path) => {
    closeMenu();
    navigate(path);
  };

  const requestLogout = () => {
    setAccountOpen(false);
    setOpen(false);
    setLogoutConfirmOpen(true);
  };

  const confirmLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      if (logout) await logout();
      setLogoutConfirmOpen(false);
      navigate("/");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isActive = (itemPath) => {
    if (itemPath === "/") return location.pathname === "/";

    const isLegacyEnterpriseProductDetail =
      role === "enterprise" &&
      itemPath === "/enterprise-products" &&
      location.pathname.startsWith("/products/");

    return (
      isLegacyEnterpriseProductDetail ||
      location.pathname === itemPath ||
      location.pathname.startsWith(`${itemPath}/`)
    );
  };

  const renderAvatar = (className) => (
    <span className={className} aria-hidden="true">
      {avatarUrl && !avatarError ? (
        <img
          src={avatarUrl}
          alt=""
          onError={() => setAvatarError(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </span>
  );

  return (
    <>
      <motion.header
      className={`preonic-header preonic-header--${themeRole} ${scrolled ? "preonic-header--scrolled" : ""}`}
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      <div className="preonic-header__bg" />

      <div className="preonic-header__container">
        <Link to={homePath} className="preonic-header__brand" onClick={closeMenu}>
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
            <span className="preonic-header__brand-tagline">{tagline}</span>
          </span>
        </Link>

        <nav className="preonic-header__nav" aria-label="Menu chính">
          {navItems.map((item) => {
            const active = isActive(item.path);
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
            <>
              {dashboardPath && (
                <button
                  type="button"
                  className="preonic-header__dashboard"
                  onClick={() => handleNavigate(dashboardPath)}
                >
                  <FiGrid />
                  <span>{roleLabel}</span>
                </button>
              )}

              <div className="preonic-header__account" ref={accountRef}>
                <button
                  type="button"
                  className={`preonic-header__account-trigger ${accountOpen ? "is-open" : ""}`}
                  onClick={() => setAccountOpen((value) => !value)}
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                >
                  {renderAvatar("preonic-header__account-avatar")}
                  <span className="preonic-header__account-copy">
                    <small>Xin chào, {greetingName}</small>
                    <strong>{displayName}</strong>
                  </span>
                  <FiChevronDown className="preonic-header__account-chevron" />
                </button>

                <AnimatePresence>
                  {accountOpen && (
                    <motion.div
                      className="preonic-header__account-menu"
                      role="menu"
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                    >
                      <div className="preonic-header__account-summary">
                        {renderAvatar("preonic-header__account-avatar preonic-header__account-avatar--large")}
                        <div>
                          <strong>{displayName}</strong>
                          <span>{user?.email || roleDescription}</span>
                          <em>{roleDescription}</em>
                        </div>
                      </div>

                      <div className="preonic-header__account-menu-list">
                        <button type="button" role="menuitem" onClick={() => handleNavigate("/profile")}>
                          <FiUser />
                          <span>
                            <strong>Hồ sơ cá nhân</strong>
                            <small>Cập nhật thông tin và ảnh đại diện</small>
                          </span>
                        </button>

                        {dashboardPath && (
                          <button type="button" role="menuitem" onClick={() => handleNavigate(dashboardPath)}>
                            <FiGrid />
                            <span>
                              <strong>Vào {roleLabel} dashboard</strong>
                              <small>Quản lý công việc và giao dịch</small>
                            </span>
                          </button>
                        )}

                        <button type="button" role="menuitem" onClick={() => handleNavigate(homePath)}>
                          <FiHome />
                          <span>
                            <strong>Trang chủ của tôi</strong>
                            <small>Quay lại không gian theo vai trò</small>
                          </span>
                        </button>
                      </div>

                      <button
                        type="button"
                        className="preonic-header__account-logout"
                        role="menuitem"
                        onClick={requestLogout}
                      >
                        <FiLogOut />
                        <span>Đăng xuất</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <button type="button" className="preonic-header__login" onClick={() => handleNavigate("/auth")}>
                Đăng nhập
              </button>

              <button type="button" className="preonic-header__register" onClick={() => handleNavigate("/register")}>
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
              {isLoggedIn && (
                <div className="preonic-header__mobile-profile">
                  {renderAvatar("preonic-header__account-avatar preonic-header__account-avatar--mobile")}
                  <div>
                    <small>Xin chào, {greetingName}</small>
                    <strong>{displayName}</strong>
                    <span>{roleDescription}</span>
                  </div>
                </div>
              )}

              {navItems.map((item) => (
                <button
                  type="button"
                  key={item.path}
                  className={[
                    isActive(item.path) ? "active" : "",
                    item.highlight ? "mobile-ai" : "",
                  ].join(" ")}
                  onClick={() => handleNavigate(item.path)}
                >
                  {item.label}
                </button>
              ))}

              <div className="preonic-header__mobile-actions">
                {isLoggedIn ? (
                  <>
                    <button type="button" onClick={() => handleNavigate("/profile")}>Hồ sơ cá nhân</button>
                    {dashboardPath && (
                      <button type="button" onClick={() => handleNavigate(dashboardPath)}>
                        Vào {roleLabel}
                      </button>
                    )}
                    <button type="button" className="mobile-logout" onClick={requestLogout}>Đăng xuất</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => handleNavigate("/auth")}>Đăng nhập</button>
                    <button type="button" onClick={() => handleNavigate("/register")}>Đăng ký</button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </motion.header>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {logoutConfirmOpen && (
              <motion.div
                className={`preonic-logout-overlay preonic-logout-overlay--${themeRole}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onMouseDown={() => !isLoggingOut && setLogoutConfirmOpen(false)}
              >
                <motion.section
                  className="preonic-logout-dialog"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="preonic-logout-title"
                  aria-describedby="preonic-logout-description"
                  initial={{ opacity: 0, y: 18, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.97 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <div className="preonic-logout-dialog__icon">
                    <FiAlertTriangle />
                  </div>

                  <span className="preonic-logout-dialog__eyebrow">Xác nhận đăng xuất</span>
                  <h2 id="preonic-logout-title">Bạn muốn đăng xuất?</h2>
                  <p id="preonic-logout-description">
                    Phiên làm việc của <strong>{displayName}</strong> sẽ kết thúc trên thiết bị này.
                    Các thay đổi đã lưu vẫn được giữ nguyên.
                  </p>

                  <div className="preonic-logout-dialog__actions">
                    <button
                      type="button"
                      className="preonic-logout-dialog__cancel"
                      onClick={() => setLogoutConfirmOpen(false)}
                      disabled={isLoggingOut}
                      autoFocus
                    >
                      Không, ở lại
                    </button>
                    <button
                      type="button"
                      className="preonic-logout-dialog__confirm"
                      onClick={confirmLogout}
                      disabled={isLoggingOut}
                    >
                      <FiLogOut />
                      {isLoggingOut ? "Đang đăng xuất..." : "Có, đăng xuất"}
                    </button>
                  </div>
                </motion.section>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}

export default Header;
