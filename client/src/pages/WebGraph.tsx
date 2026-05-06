import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Copy, ExternalLink, X, Users, ArrowRightLeft, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import type { GraphData, GraphNode, InteractionDetail } from "../types";
import { getAddressInteractions, getInteractionDetail } from "../lib/solana";

const WebGraph = () => {
  const { publicKey, connected } = useWallet();
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<InteractionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1000, h: 1000 });
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const viewBoxStart = useRef({ x: 0, y: 0, w: 1000, h: 1000 });

  const DEFAULT_VB = { x: 0, y: 0, w: 1000, h: 1000 };

  const zoomIn = useCallback(() => {
    setViewBox((prev) => {
      const s = 0.8;
      const nw = prev.w * s;
      return { x: prev.x + (prev.w - nw) / 2, y: prev.y + (prev.w - nw) / 2, w: nw, h: nw };
    });
  }, []);

  const zoomOut = useCallback(() => {
    setViewBox((prev) => {
      const s = 1.25;
      const nw = Math.min(prev.w * s, DEFAULT_VB.w * 3);
      return { x: prev.x + (prev.w - nw) / 2, y: prev.y + (prev.w - nw) / 2, w: nw, h: nw };
    });
  }, []);

  const resetZoom = useCallback(() => setViewBox(DEFAULT_VB), []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox((prev) => {
      const nw = Math.max(200, Math.min(prev.w * factor, DEFAULT_VB.w * 3));
      return { x: prev.x + (prev.w - nw) / 2, y: prev.y + (prev.w - nw) / 2, w: nw, h: nw };
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY };
    viewBoxStart.current = { ...viewBox };
  }, [viewBox]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const dx = ((e.clientX - panStart.current.x) / rect.width) * viewBoxStart.current.w;
    const dy = ((e.clientY - panStart.current.y) / rect.height) * viewBoxStart.current.h;
    setViewBox({
      x: viewBoxStart.current.x - dx,
      y: viewBoxStart.current.y - dy,
      w: viewBoxStart.current.w,
      h: viewBoxStart.current.w,
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const handleNodeHover = useCallback((node: GraphNode, e: React.MouseEvent) => {
    setHoveredNode(node);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({ x: e.clientX - rect.left + 16, y: e.clientY - rect.top - 10 });
    }
  }, []);

  const handleNodeLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  const topNodes = useMemo(
    () =>
      graphData.nodes
        .filter((node) => node.id !== publicKey?.toBase58())
        .sort((a, b) => (b.interactions || b.val) - (a.interactions || a.val))
        .slice(0, 10),
    [graphData.nodes, publicKey]
  );

  useEffect(() => {
    if (!publicKey || !connected) {
      setGraphData({ nodes: [], links: [] });
      return;
    }

    let active = true;
    const loadGraph = () => {
      setLoading(true);
      getAddressInteractions(publicKey).then((data) => {
        if (!active) return;
        setGraphData(data);
        setLoading(false);
      });
    };

    loadGraph();
    const interval = window.setInterval(loadGraph, 45_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [publicKey, connected]);

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      if (!publicKey || node.id === publicKey.toBase58()) return;
      setDetailLoading(true);
      setSelectedNode(null);
      getInteractionDetail(node.id, publicKey).then((detail) => {
        setSelectedNode(detail);
        setDetailLoading(false);
      });
    },
    [publicKey]
  );

  const nodeById = useMemo(
    () => new Map(graphData.nodes.map((node) => [node.id, node])),
    [graphData.nodes]
  );

  const getNode = (value: string | GraphNode) => {
    if (typeof value === "string") return nodeById.get(value);
    return value;
  };

  const renderNode = (node: GraphNode) => {
    const radius = node.label === "You" ? 34 : Math.max(14, Math.min(25, 11 + node.val));
    const color =
      node.label === "You"
        ? "#a855f7"
        : node.category === "exchange"
        ? "#f59e0b"
        : node.type === "wallet"
        ? "#22c55e"
        : node.type === "program"
        ? "#38bdf8"
        : "#f59e0b";
    const x = 500 + (node.x || 0);
    const y = 500 + (node.y || 0);

    return (
      <g
        key={node.id}
        onClick={() => handleNodeClick(node)}
        onMouseEnter={(e) => handleNodeHover(node, e)}
        onMouseMove={(e) => handleNodeHover(node, e)}
        onMouseLeave={handleNodeLeave}
        className={node.label === "You" ? "mesh-node mesh-node-center" : "mesh-node cursor-pointer"}
        style={{ animationDelay: `${Math.abs((node.x || 0) + (node.y || 0)) % 1600}ms` }}
      >
        <circle cx={x} cy={y} r={radius + 8} fill={color} opacity="0.08" />
        <circle cx={x} cy={y} r={radius} fill={color} opacity={node.label === "You" ? 1 : 0.86} />
        <circle cx={x} cy={y} r={radius} fill="none" stroke="#f8fafc" strokeOpacity="0.18" />
        <text
          x={x}
          y={y + radius + 20}
          textAnchor="middle"
          className="select-none fill-gray-200 text-[12px] font-medium"
        >
          {node.label}
        </text>
        {node.exchange && (
          <text
            x={x}
            y={y + radius + 37}
            textAnchor="middle"
            className="select-none fill-amber-300 text-[10px]"
          >
            exchange
          </text>
        )}
        {node.label !== "You" && (
          <text
            x={x}
            y={y + 4}
            textAnchor="middle"
            className="select-none fill-white text-[11px] font-bold"
          >
            {node.interactions || node.val}
          </text>
        )}
      </g>
    );
  };

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <Users size={48} className="text-gray-600" />
        <p className="text-gray-400">Connect your wallet to view address interactions</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Address Web</h1>
        <p className="text-gray-400">
          Visualize interactions with your address
        </p>
        <div className="flex items-center gap-2 mt-3 bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-2">
          <span className="text-gray-400 text-sm">Your address:</span>
          <span className="text-purple-400 text-sm font-mono">
            {publicKey?.toBase58().slice(0, 12)}...{publicKey?.toBase58().slice(-8)}
          </span>
          <button
            onClick={() => navigator.clipboard.writeText(publicKey?.toBase58() || "")}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <Copy size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4 mb-6">
        <div ref={containerRef} className="relative overflow-hidden rounded-lg border border-gray-800 bg-gray-900/50">
          {loading ? (
            <div className="flex items-center justify-center h-[560px]">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-purple-500 border-t-transparent" />
            </div>
          ) : graphData.nodes.length === 0 ? (
            <div className="flex items-center justify-center h-[560px] text-gray-500">
              No interaction data found
            </div>
          ) : (
            <>
              <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2 text-xs">
                <span className="rounded bg-amber-500/10 px-2 py-1 text-amber-300">Exchanges</span>
                <span className="rounded bg-green-500/10 px-2 py-1 text-green-300">Wallets</span>
                <span className="rounded bg-sky-500/10 px-2 py-1 text-sky-300">Programs</span>
                <span className="rounded bg-purple-500/10 px-2 py-1 text-purple-300">Moving mesh</span>
              </div>
              <svg
                ref={svgRef}
                viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
                className="h-[560px] w-full select-none"
                role="img"
                aria-label="Solana address interaction web"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <g className="mesh-rings">
                  <circle cx="500" cy="500" r="155" fill="none" stroke="#f59e0b" strokeDasharray="4 10" opacity="0.24" />
                  <circle cx="500" cy="500" r="260" fill="none" stroke="#22c55e" strokeDasharray="4 10" opacity="0.22" />
                  <circle cx="500" cy="500" r="365" fill="none" stroke="#38bdf8" strokeDasharray="4 10" opacity="0.18" />
                  <circle cx="500" cy="500" r="455" fill="none" stroke="#a855f7" strokeDasharray="4 10" opacity="0.12" />
                </g>

                {graphData.links.map((link, index) => {
                  const source = getNode(link.source as string | GraphNode);
                  const target = getNode(link.target as string | GraphNode);
                  if (!source || !target) return null;
                  return (
                    <line
                      key={`${String(link.source)}-${String(link.target)}-${index}`}
                      className="mesh-link"
                      x1={500 + (source.x || 0)}
                      y1={500 + (source.y || 0)}
                      x2={500 + (target.x || 0)}
                      y2={500 + (target.y || 0)}
                      stroke="#94a3b8"
                      strokeOpacity={Math.min(0.68, 0.22 + link.value * 0.05)}
                      strokeWidth={Math.min(4, 1 + link.value * 0.2)}
                    />
                  );
                })}

                {graphData.nodes.map(renderNode)}
              </svg>

              <div className="absolute right-4 top-4 z-10 flex flex-col gap-1">
                <button
                  onClick={zoomIn}
                  className="flex items-center justify-center w-8 h-8 rounded bg-gray-900/80 border border-gray-700 text-gray-300 hover:text-white hover:border-purple-500/50 transition-colors"
                  title="Zoom in"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  onClick={zoomOut}
                  className="flex items-center justify-center w-8 h-8 rounded bg-gray-900/80 border border-gray-700 text-gray-300 hover:text-white hover:border-purple-500/50 transition-colors"
                  title="Zoom out"
                >
                  <ZoomOut size={16} />
                </button>
                <button
                  onClick={resetZoom}
                  className="flex items-center justify-center w-8 h-8 rounded bg-gray-900/80 border border-gray-700 text-gray-300 hover:text-white hover:border-purple-500/50 transition-colors"
                  title="Reset view"
                >
                  <Maximize size={16} />
                </button>
              </div>

              {hoveredNode && (
                <div
                  className="absolute z-20 pointer-events-none rounded-lg bg-gray-900/95 border border-gray-700 px-3 py-2 shadow-lg max-w-[220px]"
                  style={{ left: tooltipPos.x, top: tooltipPos.y }}
                >
                  <p className="text-white text-sm font-semibold truncate">
                    {hoveredNode.exchange || hoveredNode.programName || hoveredNode.label}
                  </p>
                  <p className="text-gray-400 font-mono text-[10px] truncate mt-1">{hoveredNode.id}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs capitalize text-gray-500">{hoveredNode.category || hoveredNode.type}</span>
                    <span className="text-purple-300 text-xs font-semibold">{hoveredNode.interactions || hoveredNode.val} interactions</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <h2 className="mb-1 text-sm font-semibold text-white">Top Interactions</h2>
          <p className="mb-4 text-xs text-gray-500">Click a row or node for address details.</p>

          {topNodes.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No nodes yet</p>
          ) : (
            <div className="space-y-2">
              {topNodes.map((node) => (
                <button
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-950/40 px-3 py-3 text-left hover:border-purple-500/40 hover:bg-gray-800/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-gray-200">{node.exchange || node.programName || node.label}</p>
                    <p className="mt-1 truncate font-mono text-[10px] text-gray-500">{node.id}</p>
                    <p className="mt-1 text-xs capitalize text-gray-500">{node.category || node.type}</p>
                  </div>
                  <span className="shrink-0 rounded bg-purple-600/20 px-2 py-1 text-xs font-semibold text-purple-300">
                    {node.interactions || node.val}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {detailLoading && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-700 rounded w-2/3" />
        </div>
      )}

      {selectedNode && !detailLoading && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Interaction Details</h2>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-800/50 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-1">Label</p>
              <p className="text-white font-semibold">
                {selectedNode.exchange || selectedNode.programName || selectedNode.label}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-1">Address</p>
              <div className="flex items-center gap-2">
                <p className="text-white font-mono text-xs truncate">
                  {selectedNode.address}
                </p>
                <a
                  href={`https://solscan.io/account/${selectedNode.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-purple-400"
                >
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-1">Kind</p>
              <p className="text-white font-semibold capitalize">
                {selectedNode.category || selectedNode.type}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-1">Interactions</p>
              <p className="text-white font-semibold">{selectedNode.interactionCount}</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-1">Total SOL Transferred</p>
              <p className="text-white font-semibold">
                {selectedNode.totalSolTransferred.toFixed(4)} SOL
              </p>
            </div>
          </div>

          <h3 className="text-sm font-medium text-gray-400 mb-3">Transaction History</h3>
          <div className="space-y-2">
            {selectedNode.transactions.map((tx, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-gray-800/30 rounded-lg p-3"
              >
                <div className="flex items-center gap-3">
                  <ArrowRightLeft size={14} className="text-purple-400" />
                  <span className="text-white text-sm capitalize">{tx.type}</span>
                </div>
                <div className="text-right">
                  <span className="text-white text-sm">{tx.amount.toFixed(4)} SOL</span>
                  <span className="text-gray-500 text-xs ml-3">
                    {new Date(tx.timestamp * 1000).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WebGraph;
