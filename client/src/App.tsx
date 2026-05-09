import { Route, Routes } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import Navbar from "./components/Navbar";
import CoinDetail from "./pages/CoinDetail";
import Dashboard from "./pages/Dashboard";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import ReclaimRent from "./pages/ReclaimRent";
import WebGraph from "./pages/WebGraph";
import { AIChat } from "./components/AIChat";

function App() {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() || null;

  return (
    <div className="sketch-app min-h-screen text-white">
      <div className="sketch-frame">
        <Navbar />
        <main className="sketch-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/token/:mint" element={<CoinDetail />} />
            <Route path="/web" element={<WebGraph />} />
            <Route path="/reclaim" element={<ReclaimRent />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>
        {/* AI Chat Assistant - floating button */}
        <AIChat walletAddress={walletAddress} />
      </div>
    </div>
  );
}

export default App;
