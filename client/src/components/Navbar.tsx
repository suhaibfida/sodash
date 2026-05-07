import { Link, useLocation } from "react-router-dom";

import {
  LayoutDashboard,
  Globe,
  Recycle,
  User,
} from "lucide-react";

import WalletButton from "./WalletButton";

const navItems = [
  {
    to: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/web",
    label: "Web",
    icon: Globe,
  },
  {
    to: "/reclaim",
    label: "Reclaim Rent",
    icon: Recycle,
  },
  {
    to: "/profile",
    label: "Profile",
    icon: User,
  },
];

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="navbar-shell">

      <div className="navbar-container">

        {/* LEFT */}

        <Link
          to="/"
          className="navbar-brand"
        >

          <div className="navbar-logo">
            S
          </div>

          <div>

            <div className="navbar-title">
              Sodash
            </div>

            <div className="navbar-subtitle">
              Solana Insights Engine
            </div>

          </div>

        </Link>

        {/* CENTER */}

        <div className="navbar-tabs">

          {navItems.map(
            ({ to, label, icon: Icon }) => {

              const isActive =
                to === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(
                      to
                    );

              return (
                <Link
                  key={to}
                  to={to}
                  className={`navbar-tab ${
                    isActive
                      ? "navbar-tab-active"
                      : ""
                  }`}
                >

                  <Icon size={16} />

                  <span>{label}</span>

                </Link>
              );
            }
          )}

        </div>

        {/* RIGHT */}

        <div className="navbar-wallet">
          <WalletButton />
        </div>

      </div>

    </nav>
  );
};

export default Navbar;