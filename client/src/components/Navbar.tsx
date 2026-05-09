import { Link, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  LayoutDashboard,
  Globe,
  Recycle,
  User,
  Bell,
  Sun,
  Moon,
  Menu,
  X as XIcon,
} from "lucide-react";
import WalletButton from "./WalletButton";
import SolPriceModal from "./SolPriceModal";
import { getSolPrice } from "../lib/solana";
import sodashLogo from "../../ds-removebg-preview.png";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/web", label: "Mesh", icon: Globe },
  { to: "/reclaim", label: "Reclaim", icon: Recycle },
  { to: "/notifications", label: "AI Alerts", icon: Bell },
];

const Navbar = () => {
  const location = useLocation();
  const { connected, publicKey } = useWallet();
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [showSolModal, setShowSolModal] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string>("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const menuRef = useRef<HTMLDivElement>(null);

  const getRandomProfilePicture = (): string => {
    const profiles = ["/profile1.png", "/profile2.png", "/profile3.png"];
    return profiles[Math.floor(Math.random() * profiles.length)];
  };

  useEffect(() => {
    if (!connected) {
      // async reset so state updates happen in next tick, not synchronously in effect
      Promise.resolve().then(() => {
        setSolPrice(null);
        setProfilePicture("");
      });
      return;
    }
    if (!profilePicture) {
      Promise.resolve().then(() =>
        setProfilePicture(getRandomProfilePicture()),
      );
    }

    let active = true;
    getSolPrice()
      .then((p) => {
        if (active) setSolPrice(p.usdPrice ?? null);
      })
      .catch(console.error);
    return () => {
      active = false;
    };
  }, [connected, profilePicture]);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
    localStorage.setItem("darkMode", JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Close mobile menu on route change — use transition callback to avoid direct setState in effect
  const prevPathRef = useRef(location.pathname);
  if (prevPathRef.current !== location.pathname) {
    prevPathRef.current = location.pathname;
    if (mobileOpen) setMobileOpen(false);
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    if (mobileOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mobileOpen]);

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  return (
    <nav className="navbar-shell" ref={menuRef}>
      <div className="navbar-container rounded-full">
        {/* LOGO */}
        <Link to="/" className="navbar-brand">
          <img
            src={sodashLogo}
            alt="SODASH"
            className="navbar-logo-banner"
            onError={(e) => {
              e.currentTarget.src = "https://imgur.com/nSJCXqQ.png";
            }}
          />
        </Link>

        {/* DESKTOP TABS */}
        <div className="navbar-tabs navbar-tabs-desktop">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`navbar-tab ${isActive(to) ? "navbar-tab-active" : ""}`}
            >
              <Icon size={15} />
              <span>{label}</span>
            </Link>
          ))}
        </div>

        {/* RIGHT */}
        <div className="navbar-right">
          {/* Theme Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="navbar-theme-toggle"
            aria-label="Toggle theme"
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* SOL Price — hidden on xs */}
          {connected && (
            <button
              onClick={() => setShowSolModal(true)}
              className="navbar-sol-card navbar-sol-hide-xs cursor-pointer hover:scale-105"
            >
              <img
                src="/solana-token.svg"
                alt="Solana"
                className="navbar-solana-icon"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <div className="navbar-sol">
                <div className="navbar-sol-label">SOL</div>
                <div className="navbar-sol-price">
                  {solPrice !== null ? `$${solPrice.toFixed(2)}` : "—"}
                </div>
              </div>
            </button>
          )}

          {/* Wallet */}
          <div className="navbar-wallet">
            <WalletButton />
          </div>

          {/* Profile */}
          {connected && publicKey ? (
            <Link
              to="/profile"
              className="profile-circle-btn group relative"
              aria-label="Profile"
              title={publicKey.toBase58()}
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 opacity-75 group-hover:opacity-100 transition-opacity blur-sm" />
              <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-white/20">
                <img
                  src={profilePicture}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const parent = e.currentTarget.parentElement;
                    if (parent)
                      parent.style.background =
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
                  }}
                />
              </div>
            </Link>
          ) : (
            <Link
              to="/profile"
              className="profile-circle-btn group relative"
              aria-label="Profile"
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-600 to-gray-700 opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative">
                <User size={16} className="text-white" />
              </div>
            </Link>
          )}

          {/* Hamburger — mobile only */}
          <button
            className="navbar-hamburger"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <XIcon size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* MOBILE DROPDOWN */}
      {mobileOpen && (
        <div className="navbar-mobile-menu">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`navbar-mobile-tab ${isActive(to) ? "navbar-tab-active" : ""}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
          {connected && solPrice !== null && (
            <button
              onClick={() => {
                setShowSolModal(true);
                setMobileOpen(false);
              }}
              className="navbar-mobile-sol"
            >
              SOL &nbsp;
              <span className="text-cyan-300 font-bold">
                ${solPrice.toFixed(2)}
              </span>
            </button>
          )}
        </div>
      )}

      {showSolModal && (
        <SolPriceModal
          price={solPrice}
          onClose={() => setShowSolModal(false)}
        />
      )}
    </nav>
  );
};

export default Navbar;
