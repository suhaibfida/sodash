import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import CoinDetail from "./pages/CoinDetail";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import ReclaimRent from "./pages/ReclaimRent";
import WebGraph from "./pages/WebGraph";

function App() {
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
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
