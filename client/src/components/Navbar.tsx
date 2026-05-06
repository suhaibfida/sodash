import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Globe, Recycle, User } from "lucide-react";
import WalletButton from "./WalletButton";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/web", label: "Web", icon: Globe },
  { to: "/reclaim", label: "Reclaim Rent", icon: Recycle },
  { to: "/profile", label: "Profile", icon: User },
];

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="sketch-nav sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid min-h-24 grid-cols-1 items-center gap-4 py-4 lg:grid-cols-[1fr_auto_1fr]">
          <Link to="/" className="sketch-brand justify-self-start">
            <div className="sketch-brand-mark">SD</div>
            <span>Sodash</span>
          </Link>

          <div className="sketch-tabs">
            {navItems.map(({ to, label, icon: Icon }) => {
              const isActive =
                to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`sketch-tab ${isActive ? "sketch-tab-active" : ""}`}
                >
                  <Icon size={15} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          <div className="justify-self-end">
            <WalletButton />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
