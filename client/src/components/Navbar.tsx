import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import {
  LayoutDashboard,
  Globe,
  Recycle,
  User,
  Bell,
} from "lucide-react";

import WalletButton from "./WalletButton";
import SolPriceModal from "./SolPriceModal";
import { getSolPrice } from "../lib/solana";
import sodashLogo from "../../ds-removebg-preview.png";

const navItems = [
  {
    to: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/web",
    label: "Mesh",
    icon: Globe,
  },
  {
    to: "/reclaim",
    label: "Reclaim Rent",
    icon: Recycle,
  },
  {
    to: "/notifications",
    label: "AI Alerts",
    icon: Bell,
  },
];

const Navbar = () => {
  const location = useLocation();
  const { connected, publicKey } = useWallet();
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [showSolModal, setShowSolModal] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string>("");

  const getRandomProfilePicture = (): string => {
    const profiles = ["/profile1.png", "/profile2.png", "/profile3.png"];
    return profiles[Math.floor(Math.random() * profiles.length)];
  };

  useEffect(() => {
    if (!connected) {
      setSolPrice(null);
      setProfilePicture("");
      return;
    }

    if (!profilePicture) {
      setProfilePicture(getRandomProfilePicture());
    }

    let active = true;
    getSolPrice()
      .then((price) => {
        if (active) {
          setSolPrice(price.usdPrice ?? null);
        }
      })
      .catch(console.error);

    return () => {
      active = false;
    };
  }, [connected, profilePicture]);

  return (
    <nav className="navbar-shell">

      <div className="navbar-container rounded-full">

        {/* LEFT */}

        <Link
          to="/"
          className="navbar-brand"
        >

          <img
            src={sodashLogo}
            alt="SODASH"
            className="navbar-logo-banner"
            onError={(event) => {
              event.currentTarget.src = "https://imgur.com/nSJCXqQ.png";
            }}
          />

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

        <div className="navbar-right">
          <button
            onClick={() => setShowSolModal(true)}
            className="navbar-sol-card cursor-pointer hover:scale-105"
          >
            <img 
              src="/solana-token.svg" 
              alt="Solana" 
              className="navbar-solana-icon"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="navbar-sol">
              <div className="navbar-sol-label">SOL</div>
              <div className="navbar-sol-price">
                {solPrice !== null ? `$${solPrice.toFixed(2)}` : "-"}
              </div>
            </div>
          </button>
          <div className="navbar-wallet">
            <WalletButton />
          </div>
          {connected && publicKey ? (
            <Link 
              to="/profile" 
              className="profile-circle-btn group relative" 
              aria-label="Open profile"
              title={publicKey.toBase58()}
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 opacity-75 group-hover:opacity-100 transition-opacity blur-sm"></div>
              <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-white/20">
                <img 
                  src={profilePicture} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                  }}
                />
              </div>
            </Link>
          ) : (
            <Link to="/profile" className="profile-circle-btn group relative" aria-label="Open profile">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-600 to-gray-700 opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <div className="relative">
                <User size={16} className="text-white" />
              </div>
            </Link>
          )}
        </div>

      </div>

      {showSolModal && <SolPriceModal price={solPrice} onClose={() => setShowSolModal(false)} />}

    </nav>
  );
};

export default Navbar;
