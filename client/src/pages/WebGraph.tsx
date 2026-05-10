/* src/pages/WebGraph.tsx */

import { useEffect, useState, useCallback, useMemo, useRef } from "react";

import { useWallet } from "@solana/wallet-adapter-react";

import {
  Copy,
  ExternalLink,
  X,
  ArrowRightLeft,
  ZoomIn,
  ZoomOut,
  Maximize,
} from "lucide-react";

import type { GraphData, GraphNode, InteractionDetail } from "../types";

import { getWalletGraph, getInteractionDetail } from "../lib/solana";

const KNOWN_TOKENS: Record<string, string> = {
  "So11111111111111111111111111111111111111112": "SOL",
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT",
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": "BONK",
  "WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCdR": "WEN",
  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbZedPFTEPm3": "JUP",
  "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3GBw1xG1BqF5A": "PYTH",
  "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So": "mSOL",
  "7dHbWXmci3dT8UFYWYZweRYvrTicR42ZE5q2S1d2r2Zp": "stSOL",
};

const WebGraph = () => {
  const { publicKey, connected } = useWallet();

  /* =====================================
     STATE
  ===================================== */

  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });

  const [loading, setLoading] = useState(false);

  const [selectedNode, setSelectedNode] = useState<InteractionDetail | null>(
    null,
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);

  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  const [tooltipPos, setTooltipPos] = useState({
    x: 0,
    y: 0,
  });

  const [viewBox, setViewBox] = useState({
    x: 70,
    y: 95,
    w: 860,
    h: 860,
  });

  const svgRef = useRef<SVGSVGElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const isPanning = useRef(false);

  const panStart = useRef({
    x: 0,
    y: 0,
  });

  const viewBoxStart = useRef({
    x: 70,
    y: 95,
    w: 860,
    h: 860,
  });

  const DEFAULT_VB = {
    x: 70,
    y: 95,
    w: 860,
    h: 860,
  };

  /* =====================================
     LOAD GRAPH
  ===================================== */

  useEffect(() => {
    if (!publicKey || !connected) {
      setGraphData({ nodes: [], links: [] });
      return;
    }

    let active = true;

    const loadGraph = async () => {
      try {
        setLoading(true);

        const data = await getWalletGraph(publicKey.toBase58());

        if (!active) return;

        setGraphData(data);
      } catch (error) {
        console.error("Failed to load graph data:", error);
        if (active) {
          setGraphData({ nodes: [], links: [] });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadGraph();

    const interval = window.setInterval(loadGraph, 45_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [publicKey, connected]);

  /* =====================================
     NODE DETAILS
  ===================================== */

  const handleNodeClick = useCallback(
    async (node: GraphNode) => {
      if (!publicKey || node.id === publicKey.toBase58()) {
        return;
      }

      try {
        setDetailLoading(true);

        setSelectedNode(null);
        setSelectedNodeId(node.id);

        const detail = await getInteractionDetail(
          node.id,
          publicKey.toBase58(),
        );

        setSelectedNode(detail);
      } catch (error) {
        console.error(error);
      } finally {
        setDetailLoading(false);
      }
    },
    [publicKey],
  );

  /* =====================================
     TOOLTIP
  ===================================== */

  const handleNodeHover = useCallback(
    (node: GraphNode, e: React.MouseEvent) => {
      setHoveredNode(node);

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();

        setTooltipPos({
          x: e.clientX - rect.left + 16,

          y: e.clientY - rect.top - 10,
        });
      }
    },
    [],
  );

  const handleNodeLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  /* =====================================
     ZOOM
  ===================================== */

  const zoomIn = useCallback(() => {
    setViewBox((prev) => {
      const scale = 0.8;

      const nw = prev.w * scale;

      return {
        x: prev.x + (prev.w - nw) / 2,

        y: prev.y + (prev.h - nw) / 2,

        w: nw,
        h: nw,
      };
    });
  }, []);

  const zoomOut = useCallback(() => {
    setViewBox((prev) => {
      const scale = 1.25;

      const nw = Math.min(prev.w * scale, DEFAULT_VB.w * 3);

      return {
        x: prev.x + (prev.w - nw) / 2,

        y: prev.y + (prev.h - nw) / 2,

        w: nw,
        h: nw,
      };
    });
  }, []);

  const resetZoom = useCallback(() => {
    setViewBox(DEFAULT_VB);
  }, []);

  /* =====================================
     TRACKPAD ZOOM
  ===================================== */

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();

      const svg = svgRef.current;

      if (!svg) return;

      const rect = svg.getBoundingClientRect();

      const mx = ((e.clientX - rect.left) / rect.width) * viewBox.w + viewBox.x;

      const my = ((e.clientY - rect.top) / rect.height) * viewBox.h + viewBox.y;

      const scale = e.deltaY > 0 ? 1.05 : 0.95;

      const nw = Math.max(220, Math.min(viewBox.w * scale, DEFAULT_VB.w * 3));

      const nh = nw;

      const nx = mx - ((mx - viewBox.x) / viewBox.w) * nw;

      const ny = my - ((my - viewBox.y) / viewBox.h) * nh;

      setViewBox({
        x: nx,
        y: ny,
        w: nw,
        h: nh,
      });
    },
    [viewBox],
  );

  useEffect(() => {
    const svg = svgRef.current;

    if (!svg) return;

    svg.addEventListener("wheel", handleWheel, {
      passive: false,
    });

    return () => {
      svg.removeEventListener("wheel", handleWheel);
    };
  }, [handleWheel]);

  /* =====================================
     PAN
  ===================================== */

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;

      isPanning.current = true;

      panStart.current = {
        x: e.clientX,
        y: e.clientY,
      };

      viewBoxStart.current = {
        ...viewBox,
      };
    },
    [viewBox],
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current || !svgRef.current) {
      return;
    }

    const rect = svgRef.current.getBoundingClientRect();

    // 1:1 mapping for free movement (no artificial damping)
    const damping = 1.0;
    const dx =
      ((e.clientX - panStart.current.x) / rect.width) * viewBoxStart.current.w * damping;

    const dy =
      ((e.clientY - panStart.current.y) / rect.height) * viewBoxStart.current.h * damping;

    setViewBox({
      x: viewBoxStart.current.x - dx,

      y: viewBoxStart.current.y - dy,

      w: viewBoxStart.current.w,

      h: viewBoxStart.current.h,
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  /* =====================================
     HELPERS
  ===================================== */

  const { nodeById, positionedNodes, centerLinks } = useMemo(() => {
    const center = graphData.nodes.find((node) => node.label === "You");
    const outerNodes = graphData.nodes.filter((node) => node !== center);

    // Group by category
    const byCategory: Record<string, typeof outerNodes> = {
      exchange: [],
      wallet: [],
      program: [],
      token: [],
    };

    for (const node of outerNodes) {
      const cat = node.category || "wallet";
      if (!byCategory[cat]) {
        byCategory[cat] = [];
      }
      byCategory[cat].push(node);
    }

    // Define orbital radii for each category
    const orbits: Record<string, number> = {
      exchange: 350,
      wallet: 250,
      program: 300,
      token: 200,
    };

    const positioned: GraphNode[] = [];
    
    if (center) {
      positioned.push({ ...center, x: 0, y: 0 });
    }

    Object.entries(byCategory).forEach(([category, nodes]) => {
      const radius = orbits[category] || 200;
      
      nodes.forEach((node, index) => {
        let angle = 0;
        
        if (category === "program") {
          // Do not align horizontally, cluster at the top with fixed spacing
          const spacing = Math.PI / 6; // 30 degrees space between programs
          const startAngle = -Math.PI / 2 - ((nodes.length - 1) * spacing) / 2;
          angle = startAngle + index * spacing;
        } else if (category === "exchange") {
          // Cluster exchanges at the bottom
          const spacing = Math.PI / 6;
          const startAngle = Math.PI / 2 - ((nodes.length - 1) * spacing) / 2;
          angle = startAngle + index * spacing;
        } else if (category === "token") {
          // Cluster tokens at the bottom-right or somewhere else
          const spacing = Math.PI / 6;
          const startAngle = Math.PI / 4 - ((nodes.length - 1) * spacing) / 2;
          angle = startAngle + index * spacing;
        } else {
          // Spread wallets evenly around the circle
          angle = (Math.PI * 2 * index) / Math.max(nodes.length, 1);
        }
        
        positioned.push({
          ...node,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        });
      });
    });

    // Links from center to all nodes
    const centerLinks = outerNodes.map((node) => ({
      source: center?.id || "",
      target: node.id,
      value: 1,
    }));

    return {
      nodeById: new Map(positioned.map((node) => [node.id, node])),
      positionedNodes: positioned,
      centerLinks,
    };
  }, [graphData.nodes]);

  const getNode = (value: string | GraphNode) => {
    if (typeof value === "string") {
      return nodeById.get(value);
    }

    return value;
  };

  /* =====================================
     NODE UI
  ===================================== */

  const renderNode = (node: GraphNode) => {
    const radius =
      node.label === "You"
        ? 38
        : Math.max(16, Math.min(28, 12 + (node.val || 0) * 1.2));

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
    
    const isSelected = selectedNodeId === node.id;

    const orbitR1 = radius + 14;
    const orbitR2 = radius + 26;
    const orbitR3 = radius + 38;

    const dotR = 2.5;
    const t = Date.now() / 4000;
    const orbitDots = [
      { angle: t, r: orbitR1, opacity: 0.6, size: dotR },
      { angle: t + Math.PI * 0.66, r: orbitR1, opacity: 0.4, size: dotR * 0.7 },
      { angle: t + Math.PI * 1.33, r: orbitR2, opacity: 0.5, size: dotR * 0.9 },
      { angle: -t * 0.7 + 1, r: orbitR2, opacity: 0.35, size: dotR * 0.6 },
      { angle: t * 0.5 + 2.5, r: orbitR3, opacity: 0.3, size: dotR * 0.8 },
    ];

    return (
      <g
        key={node.id}
        onClick={() => handleNodeClick(node)}
        onMouseEnter={(e) => handleNodeHover(node, e)}
        onMouseMove={(e) => handleNodeHover(node, e)}
        onMouseLeave={handleNodeLeave}
        className="mesh-node cursor-pointer"
        style={{ opacity: node.label === "You" ? 1 : 0.85 }}
      >
        {/* Outer glow */}
        <circle cx={x} cy={y} r={radius + 40} fill={color} opacity="0.04" />

        {/* Orbit rings */}
        <circle cx={x} cy={y} r={orbitR1} fill="none" stroke={color} strokeOpacity="0.12" strokeWidth="1" strokeDasharray="3 6" />
        <circle cx={x} cy={y} r={orbitR2} fill="none" stroke={color} strokeOpacity="0.08" strokeWidth="0.8" strokeDasharray="2 8" />
        <circle cx={x} cy={y} r={orbitR3} fill="none" stroke={color} strokeOpacity="0.05" strokeWidth="0.6" strokeDasharray="1.5 10" />

        {/* Selection Highlight */}
        {isSelected && (
          <circle cx={x} cy={y} r={radius + 18} fill="none" stroke="#ffffff" strokeWidth="4" opacity="1" className="animate-pulse" />
        )}

        {/* Orbiting dots */}
        {orbitDots.map((dot, i) => (
          <circle
            key={i}
            cx={x + Math.cos(dot.angle) * dot.r}
            cy={y + Math.sin(dot.angle) * dot.r}
            r={dot.size}
            fill={color}
            opacity={dot.opacity}
          />
        ))}

        {/* Node ring */}
        <circle
          className="mesh-node-ring"
          cx={x}
          cy={y}
          r={radius + 8}
          fill="none"
          stroke={color}
          strokeOpacity="0.35"
          strokeWidth="2"
        />

        {/* Inner glow */}
        <circle cx={x} cy={y} r={radius + 4} fill={color} opacity="0.15" />

        {/* Main body */}
        <circle cx={x} cy={y} r={radius} fill={color} opacity="0.92" />

        {/* Highlight */}
        <circle
          cx={x - radius * 0.25}
          cy={y - radius * 0.25}
          r={radius * 0.35}
          fill="#ffffff"
          opacity="0.2"
        />

        {/* Core */}
        <circle cx={x} cy={y} r={radius * 0.18} fill="#ffffff" opacity="0.7" />

        {/* Label */}
        <text
          x={x}
          y={y + radius + 28}
          textAnchor="middle"
          className="fill-gray-100 text-[12px] font-semibold select-none pointer-events-none"
        >
          {node.label}
        </text>
      </g>
    );
  };

  if (!connected || !publicKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <div className="flex gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-full bg-gray-700/40"
              style={{ width: 40 + i * 12, height: 40 + i * 12 }}
            />
          ))}
        </div>
        <p className="text-gray-400">
          Connect your wallet to view address interactions
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard-shell web-shell">
      <div className="mb-3">
        <p className="text-slate-200 text-md px-3 py-1 rounded-lg bg-gray-800/50 border border-purple-700/50 inline-block">
          Wallet interaction mesh
        </p>
      </div>

      <div
        className={`grid gap-2 ${
          selectedNode || detailLoading
            ? "grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px]"
            : "grid-cols-1"
        }`}
      >
        {/* GRAPH */}

        <div
          ref={containerRef}
          className="mesh-web-panel relative overflow-hidden rounded-2xl border border-cyan-500/10 bg-gray-900/50"
          onMouseLeave={handleMouseUp}
        >
          <div className="mesh-dot-field" aria-hidden="true" />

          {loading ? (
            <div className="relative z-[1] flex flex-col items-center justify-center h-[50vh] min-h-[320px] max-h-[480px] gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-400 border-t-transparent" />
              <p className="text-gray-400 text-sm">
                Loading interaction graph...
              </p>
            </div>
          ) : graphData.nodes.length === 0 ? (
            <div className="relative z-[1] flex flex-col items-center justify-center h-[50vh] min-h-[320px] max-h-[480px] gap-6 px-6">
              <div className="flex gap-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="rounded-full bg-gray-700/60 animate-pulse"
                    style={{
                      width: 48 + i * 16,
                      height: 48 + i * 16,
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
              <p className="text-gray-400 text-center text-sm">
                No interaction data found.
                <br />
                <span className="text-gray-500 text-xs">
                  Try a wallet with transaction history on Solana mainnet.
                </span>
              </p>
            </div>
          ) : (
            <>
              {/* LEGEND */}

              <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1 text-[10px]">
                <span className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-amber-300">
                  Exchanges
                </span>

                <span className="rounded-xl bg-green-500/10 border border-green-500/20 px-3 py-2 text-green-300">
                  Wallets
                </span>

                <span className="rounded-xl bg-sky-500/10 border border-sky-500/20 px-3 py-2 text-sky-300">
                  Programs
                </span>
              </div>

              {/* SVG */}

              <svg
                ref={svgRef}
                viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
                className="mesh-web-svg relative z-[1] h-[65vh] min-h-[350px] max-h-[700px] w-full select-none"
                role="img"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                {/* LINKS TO CENTER (Solar System) */}

                {centerLinks.map((link, index) => {
                  const source = getNode(link.source as string | GraphNode);
                  const target = getNode(link.target as string | GraphNode);

                  if (!source || !target) {
                    return null;
                  }

                  const sx = 500 + (source.x || 0);
                  const sy = 500 + (source.y || 0);
                  const tx = 500 + (target.x || 0);
                  const ty = 500 + (target.y || 0);

                  // Determine line color by target category
                  const categoryColors: Record<string, string> = {
                    exchange: "#f59e0b",
                    wallet: "#22c55e",
                    program: "#38bdf8",
                    token: "#ec4899",
                  };
                  const color =
                    categoryColors[target.category || "wallet"] || "#9ca3af";

                  const opacity = 0.18;

                  return (
                    <g key={`center-link-${index}`}>
                      <line
                        x1={sx}
                        y1={sy}
                        x2={tx}
                        y2={ty}
                        stroke={color}
                        strokeOpacity={opacity}
                        strokeWidth="1.5"
                        strokeDasharray="5 7"
                      />
                      <line
                        x1={sx}
                        y1={sy}
                        x2={tx}
                        y2={ty}
                        stroke={color}
                        strokeOpacity={0.06}
                        strokeWidth="6"
                        strokeLinecap="round"
                      />
                    </g>
                  );
                })}

                {/* NODES */}

                {positionedNodes.map(renderNode)}
              </svg>

              {/* CONTROLS */}

              <div className="absolute right-5 top-5 z-10 flex flex-col gap-2">
                <button onClick={zoomIn} className="mesh-control-button">
                  <ZoomIn size={16} />
                </button>

                <button onClick={zoomOut} className="mesh-control-button">
                  <ZoomOut size={16} />
                </button>

                <button onClick={resetZoom} className="mesh-control-button">
                  <Maximize size={16} />
                </button>
              </div>

              {/* TOOLTIP */}

              {hoveredNode && (
                <div
                  className="mesh-tooltip absolute z-20 pointer-events-none rounded-xl bg-gray-900/95 border border-cyan-500/20 px-3 py-2 shadow-2xl max-w-[220px]"
                  style={{
                    left: tooltipPos.x,
                    top: tooltipPos.y,
                  }}
                >
                  <p className="text-white text-sm font-semibold truncate">
                    {hoveredNode.exchange ||
                      hoveredNode.programName ||
                      hoveredNode.label}
                  </p>

                  <p className="text-gray-400 font-mono text-[10px] truncate mt-1">
                    {hoveredNode.id}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* DETAILS */}

        {(selectedNode || detailLoading) && (
          <div className="rounded-3xl border border-cyan-500/10 bg-gray-900/50 backdrop-blur-xl p-4 overflow-y-auto h-fit max-h-[62vh]">
            {detailLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-5 bg-gray-700 rounded w-1/2" />

                <div className="h-4 bg-gray-700 rounded w-3/4" />

                <div className="h-4 bg-gray-700 rounded w-1/3" />
              </div>
            ) : (
              selectedNode && (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-white font-semibold text-lg">
                      Interaction Details
                    </h2>

                    <button
                      onClick={() => {
                        setSelectedNode(null);
                        setSelectedNodeId(null);
                      }}
                      className="text-gray-500 hover:text-white"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* LABEL */}

                    <div className="mesh-detail-card">
                      <p className="mesh-detail-label">Label</p>

                      <p className="mesh-detail-value">
                        {selectedNode.exchange ||
                          selectedNode.programName ||
                          selectedNode.label}
                      </p>
                    </div>

                    {/* ADDRESS */}

                    <div className="mesh-detail-card">
                      <div className="flex items-center justify-between mb-2">
                        <p className="mesh-detail-label">Address</p>

                        <button
                          onClick={() =>
                            navigator.clipboard.writeText(selectedNode.address)
                          }
                          className="mesh-copy-button"
                        >
                          <Copy size={12} />
                        </button>
                      </div>

                      <p className="mesh-address">{selectedNode.address}</p>
                    </div>

                    {/* STATS */}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="mesh-detail-card">
                        <p className="mesh-detail-label">Type</p>

                        <p className="mesh-detail-value capitalize">
                          {selectedNode.category || selectedNode.type}
                        </p>
                      </div>

                      <div className="mesh-detail-card">
                        <p className="mesh-detail-label">Interactions</p>

                        <p className="mesh-detail-value">
                          {selectedNode.interactionCount}
                        </p>
                      </div>
                    </div>

                    {/* SOL */}

                    <div className="mesh-detail-card">
                      <p className="mesh-detail-label">
                        {Math.abs(selectedNode.totalSolTransferred) > 0
                          ? "Total SOL Transferred"
                          : selectedNode.transactions?.some((tx) => tx.tokenAmount)
                          ? "Total Token Transferred"
                          : "Total SOL Transferred"}
                      </p>

                      <p className="text-2xl font-bold text-cyan-300 mt-2">
                        {Math.abs(selectedNode.totalSolTransferred) > 0 ? (
                          `${Math.abs(selectedNode.totalSolTransferred).toLocaleString(undefined, { maximumFractionDigits: 4, maximumSignificantDigits: 6 })} SOL`
                        ) : selectedNode.transactions?.some((tx) => tx.tokenAmount !== undefined) ? (
                          (() => {
                            const tokenTotal = selectedNode.transactions?.reduce(
                              (sum, tx) => sum + Math.abs(tx.tokenAmount ?? 0),
                              0,
                            );
                            const tokenMint =
                              selectedNode.transactions?.find((tx) => tx.tokenMint)
                                ?.tokenMint;
                            const tokenSymbol = tokenMint 
                                ? (KNOWN_TOKENS[tokenMint] || tokenMint.slice(0, 4).toUpperCase()) 
                                : "TOKEN";
                            return `${tokenTotal?.toLocaleString(undefined, { maximumFractionDigits: 4, maximumSignificantDigits: 6 }) ?? 0} ${tokenSymbol}`;
                          })()
                        ) : (
                          "0 SOL"
                        )}
                      </p>
                    </div>

                    {/* SOLSCAN */}

                    <a
                      href={`https://solscan.io/account/${selectedNode.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mesh-solscan-button"
                    >
                      <ExternalLink size={14} />

                      <span>Open In Solscan</span>
                    </a>

                    {/* TXS */}

                    {selectedNode.transactions?.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-white font-semibold">
                            Recent Transactions
                          </h3>

                          <span className="text-xs text-slate-500">
                            {selectedNode.transactions.length} txs
                          </span>
                        </div>

                        <div className="space-y-3">
                          {selectedNode.transactions
                            .slice(0, 6)
                            .map((tx, index) => (
                              <div
                                key={index}
                                className="mesh-transaction-card"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="mesh-tx-icon">
                                    <ArrowRightLeft size={14} />
                                  </div>

                                  <div>
                                    <p className="text-white text-sm capitalize">
                                      {tx.type}
                                    </p>

                                    <p className="text-slate-500 text-xs">
                                      {new Date(
                                        tx.timestamp * 1000,
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <p className="text-cyan-300 text-sm font-semibold">
                                    {tx.tokenAmount !== undefined && tx.tokenAmount !== null
                                      ? (() => {
                                          const symbol = tx.tokenMint ? (KNOWN_TOKENS[tx.tokenMint] || tx.tokenMint.slice(0, 4).toUpperCase()) : "TOKEN";
                                          return `${Math.abs(tx.tokenAmount).toLocaleString(undefined, { maximumFractionDigits: 4, maximumSignificantDigits: 6 })} ${symbol}`;
                                        })()
                                      : `${Math.abs(tx.amount).toLocaleString(undefined, { maximumFractionDigits: 4, maximumSignificantDigits: 6 })} SOL`}
                                  </p>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WebGraph;
