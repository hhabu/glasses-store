import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Cart from "./Cart";
import "../../styles/NavBar.css";
import { useAuth } from "../../context/AuthContext";
import { DEFAULT_AVATAR_URL } from "../../constants/avatar";

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState(searchParams.get("q") || "");
  const profileMenuRef = useRef(null);

  useEffect(() => {
    if (location.pathname === "/") {
      setSearchKeyword(searchParams.get("q") || "");
    }
  }, [location.pathname, searchParams]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    setShowMenu(false);
    logout();
    navigate("/");
  };

  const goToDashboard = () => {
    switch (user.role) {
      case "SALES":
        navigate("/sales");
        break;
      case "OPERATION":
        navigate("/operation");
        break;
      case "MANAGER":
        navigate("/manager");
        break;
      case "ADMIN":
        navigate("/admin");
        break;
      default:
        navigate("/");
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const keyword = searchKeyword.trim();
    navigate(keyword ? `/?q=${encodeURIComponent(keyword)}` : "/");
  };

  const handleMenuNavigate = (path) => {
    setShowMenu(false);
    navigate(path);
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* LEFT */}
        <div className="navbar-logo" onClick={() => navigate("/")}>
          <h2>Glasses Shop</h2>
        </div>

        {/* CENTER */}
        <form className="navbar-search" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            placeholder="Search products..."
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
            aria-label="Search products"
          />
        </form>

        {/* RIGHT */}
        <div className="navbar-actions">
          {/* NOT LOGGED IN */}
          {!user && (
            <button className="btn login" onClick={() => navigate("/login")}>
              Login
            </button>
          )}

          {/* CUSTOMER ONLY */}
          {user?.role === "CUSTOMER" && (
            <>
              <button
                className="btn design-glasses-btn"
                onClick={() => navigate("/design-glasses")}
              >
                Design Glasses
              </button>
              <Cart />
            </>
          )}

          {/* LOGGED IN (ALL ROLES) */}
          {user && (
            <div className="profile-wrapper" ref={profileMenuRef}>
              <img
                src={user.avatar || DEFAULT_AVATAR_URL}
                alt="profile"
                className="profile-avatar"
                onError={(event) => {
                  event.currentTarget.src = DEFAULT_AVATAR_URL;
                }}
                onClick={() => setShowMenu(!showMenu)}
              />

              {showMenu && (
                <div className="profile-menu">
                  {/* CUSTOMER MENU */}
                  {user.role === "CUSTOMER" ? (
                    <>
                      <div onClick={() => handleMenuNavigate("/profile")}>Profile</div>
                      <div onClick={() => handleMenuNavigate("/eye-profile")}>
                        Eye Profile
                      </div>
                      <div onClick={() => handleMenuNavigate("/orders")}>
                        Order History
                      </div>
                      <div onClick={() => handleMenuNavigate("/returns")}>
                        Return Request
                      </div>
                    </>
                  ) : (
                    <>
                      {/* SALES / OPERATION / MANAGER / ADMIN */}
                      <div
                        onClick={() => {
                          setShowMenu(false);
                          goToDashboard();
                        }}
                      >
                        Dashboard
                      </div>
                    </>
                  )}

                  <div className="logout" onClick={handleLogout}>
                    Logout
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
