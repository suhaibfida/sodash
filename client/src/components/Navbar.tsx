import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import {
  LayoutDashboard,
  Globe,
  Recycle,
  User,
} from "lucide-react";

import WalletButton from "./WalletButton";
import SolPriceModal from "./SolPriceModal";
import { getSolPrice } from "../lib/solana";
import { generateAvatarUrl } from "../lib/avatar";
import sodashLogo from "../../ds-removebg-preview.png";

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
];

const Navbar = () => {
  const location = useLocation();
  const { connected, publicKey } = useWallet();
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [showSolModal, setShowSolModal] = useState(false);

  useEffect(() => {
    if (!connected) {
      setSolPrice(null);
      return;
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
  }, [connected]);

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
              className="profile-circle-btn" 
              aria-label="Open profile"
              title={publicKey.toBase58()}
            >
              <img 
                src={generateAvatarUrl(publicKey.toBase58())} 
                alt="Profile" 
                className="w-full h-full rounded-full"
                onError={(e) => {
                  e.currentTarget.style.backgroundColor = '#8b5cf6';
                }}
              />
            </Link>
          ) : (
            <Link to="/profile" className="profile-circle-btn" aria-label="Open profile">
              <User size={16} />
            </Link>
          )}
        </div>

      </div>

      {showSolModal && <SolPriceModal price={solPrice} onClose={() => setShowSolModal(false)} />}

    </nav>
  );
};

export default Navbar;
