/* src/pages/WebGraph.tsx */

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";

import { useWallet } from "@solana/wallet-adapter-react";

import {
  Copy,
  ExternalLink,
  X,
  Users,
  ArrowRightLeft,
  ZoomIn,
  ZoomOut,
  Maximize,
} from "lucide-react";

import type {
  GraphData,
  GraphNode,
  InteractionDetail,
} from "../types";

import {
  getAddressInteractions,
  getInteractionDetail,
} from "../lib/solana";

const WebGraph = () => {
  const { publicKey, connected } =
    useWallet();

  const [graphData, setGraphData] =
    useState<GraphData>({
      nodes: [],
      links: [],
    });

  const [loading, setLoading] =
    useState(false);

  const [selectedNode, setSelectedNode] =
    useState<InteractionDetail | null>(
      null
    );

  const [detailLoading, setDetailLoading] =
    useState(false);

  const [hoveredNode, setHoveredNode] =
    useState<GraphNode | null>(null);

  const [tooltipPos, setTooltipPos] =
    useState({
      x: 0,
      y: 0,
    });

  const [viewBox, setViewBox] =
    useState({
      x: 0,
      y: 0,
      w: 1000,
      h: 1000,
    });

  const svgRef =
    useRef<SVGSVGElement>(null);

  const containerRef =
    useRef<HTMLDivElement>(null);

  const isPanning = useRef(false);

  const panStart = useRef({
    x: 0,
    y: 0,
  });

  const viewBoxStart = useRef({
    x: 0,
    y: 0,
    w: 1000,
    h: 1000,
  });

  const DEFAULT_VB = {
    x: 0,
    y: 0,
    w: 1000,
    h: 1000,
  };

  /* =====================================
     ZOOM
  ===================================== */

  const zoomIn = useCallback(() => {
    setViewBox((prev) => {
      const scale = 0.8;

      const nw = prev.w * scale;

      return {
        x:
          prev.x +
          (prev.w - nw) / 2,

        y:
          prev.y +
          (prev.h - nw) / 2,

        w: nw,
        h: nw,
      };
    });
  }, []);

  const zoomOut = useCallback(() => {
    setViewBox((prev) => {
      const scale = 1.25;

      const nw = Math.min(
        prev.w * scale,
        DEFAULT_VB.w * 3
      );

      return {
        x:
          prev.x +
          (prev.w - nw) / 2,

        y:
          prev.y +
          (prev.h - nw) / 2,

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

      const rect =
        svg.getBoundingClientRect();

      const mx =
        ((e.clientX - rect.left) /
          rect.width) *
          viewBox.w +
        viewBox.x;

      const my =
        ((e.clientY - rect.top) /
          rect.height) *
          viewBox.h +
        viewBox.y;

      const scale =
        e.deltaY > 0
          ? 1.08
          : 0.92;

      const nw = Math.max(
        220,
        Math.min(
          viewBox.w * scale,
          DEFAULT_VB.w * 3
        )
      );

      const nh = nw;

      const nx =
        mx -
        ((mx - viewBox.x) /
          viewBox.w) *
          nw;

      const ny =
        my -
        ((my - viewBox.y) /
          viewBox.h) *
          nh;

      setViewBox({
        x: nx,
        y: ny,
        w: nw,
        h: nh,
      });
    },
    [viewBox]
  );

  useEffect(() => {
    const svg = svgRef.current;

    if (!svg) return;

    svg.addEventListener(
      "wheel",
      handleWheel,
      {
        passive: false,
      }
    );

    return () => {
      svg.removeEventListener(
        "wheel",
        handleWheel
      );
    };
  }, [handleWheel]);

  /* =====================================
     PAN
  ===================================== */

  const handleMouseDown =
    useCallback(
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
      [viewBox]
    );

  const handleMouseMove =
    useCallback(
      (e: React.MouseEvent) => {
        if (
          !isPanning.current ||
          !svgRef.current
        )
          return;

        const rect =
          svgRef.current.getBoundingClientRect();

        const dx =
          ((e.clientX -
            panStart.current.x) /
            rect.width) *
          viewBoxStart.current.w;

        const dy =
          ((e.clientY -
            panStart.current.y) /
            rect.height) *
          viewBoxStart.current.h;

        setViewBox({
          x:
            viewBoxStart.current.x -
            dx,

          y:
            viewBoxStart.current.y -
            dy,

          w:
            viewBoxStart.current.w,

          h:
            viewBoxStart.current.h,
        });
      },
      []
    );

  const handleMouseUp =
    useCallback(() => {
      isPanning.current = false;
    }, []);

  /* =====================================
     TOOLTIP
  ===================================== */

  const handleNodeHover =
    useCallback(
      (
        node: GraphNode,
        e: React.MouseEvent
      ) => {
        setHoveredNode(node);

        if (containerRef.current) {
          const rect =
            containerRef.current.getBoundingClientRect();

          setTooltipPos({
            x:
              e.clientX -
              rect.left +
              16,

            y:
              e.clientY -
              rect.top -
              10,
          });
        }
      },
      []
    );

  const handleNodeLeave =
    useCallback(() => {
      setHoveredNode(null);
    }, []);

  /* =====================================
     LOAD GRAPH
  ===================================== */

  useEffect(() => {
    if (!publicKey || !connected) {
      setGraphData({
        nodes: [],
        links: [],
      });

      return;
    }

    let active = true;

    const loadGraph = () => {
      setLoading(true);

      getAddressInteractions(
        publicKey
      ).then((data) => {
        if (!active) return;

        setGraphData(data);

        setLoading(false);
      });
    };

    loadGraph();

    const interval =
      window.setInterval(
        loadGraph,
        45000
      );

    return () => {
      active = false;

      window.clearInterval(
        interval
      );
    };
  }, [publicKey, connected]);

  /* =====================================
     NODE DETAILS
  ===================================== */

  const handleNodeClick =
    useCallback(
      (node: GraphNode) => {
        if (
          node.id ===
          publicKey?.toBase58()
        )
          return;

        if (!publicKey) return;

        setDetailLoading(true);

        setSelectedNode(null);

        getInteractionDetail(
          node.id,
          publicKey
        ).then((detail) => {
          setSelectedNode(detail);

          setDetailLoading(false);
        });
      },
      [publicKey]
    );

  /* =====================================
     HELPERS
  ===================================== */

  const nodeById = useMemo(
    () =>
      new Map(
        graphData.nodes.map((node) => [
          node.id,
          node,
        ])
      ),
    [graphData.nodes]
  );

  const getNode = (
    value: string | GraphNode
  ) => {
    if (typeof value === "string") {
      return nodeById.get(value);
    }

    return value;
  };

  /* =====================================
     NODES
  ===================================== */

  const renderNode = (
    node: GraphNode
  ) => {

    const radius =
      node.label === "You"
        ? 34
        : Math.max(
            14,
            Math.min(
              25,
              11 + node.val
            )
          );

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

    const x =
      500 + (node.x || 0);

    const y =
      500 + (node.y || 0);

    return (
      <g
        key={node.id}
        onClick={() =>
          handleNodeClick(node)
        }
        onMouseEnter={(e) =>
          handleNodeHover(node, e)
        }
        onMouseMove={(e) =>
          handleNodeHover(node, e)
        }
        onMouseLeave={
          handleNodeLeave
        }
        className={
          node.label === "You"
            ? "mesh-node mesh-node-center"
            : "mesh-node cursor-pointer"
        }
      >

        <circle
          cx={x}
          cy={y}
          r={radius + 22}
          fill={color}
          opacity="0.05"
        />

        <circle
          className="mesh-node-ring"
          cx={x}
          cy={y}
          r={radius + 10}
          fill="none"
          stroke={color}
          strokeOpacity="0.25"
          strokeWidth="2"
        />

        <circle
          cx={x}
          cy={y}
          r={radius + 8}
          fill={color}
          opacity="0.12"
        />

        <circle
          cx={x}
          cy={y}
          r={radius}
          fill={color}
          opacity="0.95"
        />

        <circle
          cx={x - radius * 0.25}
          cy={y - radius * 0.25}
          r={radius * 0.35}
          fill="#ffffff"
          opacity="0.22"
        />

        <circle
          cx={x}
          cy={y}
          r={radius * 0.18}
          fill="#ffffff"
          opacity="0.7"
        />

        <text
          x={x}
          y={y + radius + 22}
          textAnchor="middle"
          className="fill-gray-200 text-[12px] font-medium select-none"
        >
          {node.label}
        </text>

      </g>
    );
  };

  if (!connected) {
    return (
      <div className="dashboard-shell">

        <div className="reclaim-hero">

          <div className="reclaim-glow-card">

            <Users
              size={60}
              className="text-cyan-300 mx-auto"
            />

            <h1 className="text-5xl font-black text-white mt-8">
              Address Web
            </h1>

            <p className="text-slate-400 mt-5 text-xl">
              Connect your wallet to
              visualize wallet
              interactions
            </p>

          </div>

        </div>

      </div>
    );
  }

  return (
    <div className="dashboard-shell">

      <div className="mb-5">

        <p className="text-slate-400">
          Visualize - Select the mesh to interact with it
        </p>

      </div>

      <div
        className={`grid gap-4 ${
          selectedNode ||
          detailLoading
            ? "grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px]"
            : "grid-cols-1"
        }`}
      >

        {/* GRAPH */}

        <div
          ref={containerRef}
          className="mesh-web-panel relative overflow-hidden rounded-3xl border border-cyan-500/10 bg-gray-900/50"
          onMouseLeave={
            handleMouseUp
          }
        >

          <div
            className="mesh-dot-field"
            aria-hidden="true"
          />

          {loading ? (
            <div className="relative z-[1] flex items-center justify-center h-[72vh] min-h-[520px] max-h-[760px]">

              <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-400 border-t-transparent" />

            </div>
          ) : (
            <>
              <div className="absolute left-5 top-5 z-10 flex flex-wrap gap-2 text-xs">

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
                className="relative z-[1] h-[72vh] min-h-[520px] max-h-[760px] w-full select-none"
                role="img"
                onMouseDown={
                  handleMouseDown
                }
                onMouseMove={
                  handleMouseMove
                }
                onMouseUp={
                  handleMouseUp
                }
              >

                {/* RINGS */}

                <g className="mesh-rings">

                  <circle
                    cx="500"
                    cy="500"
                    r="160"
                    fill="none"
                    stroke="#f59e0b"
                    strokeDasharray="4 10"
                    opacity="0.24"
                  />

                  <circle
                    cx="500"
                    cy="500"
                    r="270"
                    fill="none"
                    stroke="#22c55e"
                    strokeDasharray="4 10"
                    opacity="0.22"
                  />

                  <circle
                    cx="500"
                    cy="500"
                    r="380"
                    fill="none"
                    stroke="#38bdf8"
                    strokeDasharray="4 10"
                    opacity="0.18"
                  />

                  <circle
                    cx="500"
                    cy="500"
                    r="470"
                    fill="none"
                    stroke="#a855f7"
                    strokeDasharray="4 10"
                    opacity="0.12"
                  />

                </g>

                {/* LINKS */}

                {graphData.links.map(
                  (link, index) => {
                    const source =
                      getNode(
                        link.source as
                          | string
                          | GraphNode
                      );

                    const target =
                      getNode(
                        link.target as
                          | string
                          | GraphNode
                      );

                    if (
                      !source ||
                      !target
                    )
                      return null;

                    return (
                      <line
                        key={`${String(
                          link.source
                        )}-${String(
                          link.target
                        )}-${index}`}
                        className="mesh-link"
                        x1={
                          500 +
                          (source.x || 0)
                        }
                        y1={
                          500 +
                          (source.y || 0)
                        }
                        x2={
                          500 +
                          (target.x || 0)
                        }
                        y2={
                          500 +
                          (target.y || 0)
                        }
                        stroke="#94a3b8"
                        strokeOpacity={Math.min(
                          0.68,
                          0.22 +
                            link.value *
                              0.05
                        )}
                        strokeWidth={Math.min(
                          4,
                          1 +
                            link.value *
                              0.2
                        )}
                      />
                    );
                  }
                )}

                {/* NODES */}

                {graphData.nodes.map(
                  renderNode
                )}

              </svg>

              {/* CONTROLS */}

              <div className="absolute right-5 top-5 z-10 flex flex-col gap-2">

                <button
                  onClick={zoomIn}
                  className="mesh-control-button"
                >
                  <ZoomIn size={16} />
                </button>

                <button
                  onClick={zoomOut}
                  className="mesh-control-button"
                >
                  <ZoomOut size={16} />
                </button>

                <button
                  onClick={resetZoom}
                  className="mesh-control-button"
                >
                  <Maximize
                    size={16}
                  />
                </button>

              </div>

              {/* TOOLTIP */}

              {hoveredNode && (
                <div
                  className="mesh-tooltip absolute z-20 pointer-events-none rounded-xl bg-gray-900/95 border border-cyan-500/20 px-3 py-2 shadow-2xl max-w-[220px]"
                  style={{
                    left:
                      tooltipPos.x,
                    top:
                      tooltipPos.y,
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

        {/* DETAILS PANEL */}

        {(selectedNode ||
          detailLoading) && (
          <div className="rounded-3xl border border-cyan-500/10 bg-gray-900/50 backdrop-blur-xl p-4 overflow-y-auto h-fit max-h-[72vh]">

            {detailLoading ? (
              <div className="space-y-4 animate-pulse">

                <div className="h-5 bg-gray-700 rounded w-1/2" />

                <div className="h-4 bg-gray-700 rounded w-3/4" />

                <div className="h-4 bg-gray-700 rounded w-1/3" />

              </div>
            ) : (
              selectedNode && (
                <>
                  {/* HEADER */}

                  <div className="flex items-center justify-between mb-5">

                    <h2 className="text-white font-semibold text-lg">
                      Interaction Details
                    </h2>

                    <button
                      onClick={() =>
                        setSelectedNode(
                          null
                        )
                      }
                      className="text-gray-500 hover:text-white"
                    >
                      <X size={18} />
                    </button>

                  </div>

                  {/* CONTENT */}

                  <div className="space-y-4">

                    {/* LABEL */}

                    <div className="mesh-detail-card">

                      <p className="mesh-detail-label">
                        Label
                      </p>

                      <p className="mesh-detail-value">
                        {selectedNode.exchange ||
                          selectedNode.programName ||
                          selectedNode.label}
                      </p>

                    </div>

                    {/* ADDRESS */}

                    <div className="mesh-detail-card">

                      <div className="flex items-center justify-between mb-2">

                        <p className="mesh-detail-label">
                          Address
                        </p>

                        <button
                          onClick={() =>
                            navigator.clipboard.writeText(
                              selectedNode.address
                            )
                          }
                          className="mesh-copy-button"
                        >

                          <Copy size={12} />

                        </button>

                      </div>

                      <p className="mesh-address">
                        {selectedNode.address}
                      </p>

                    </div>

                    {/* STATS */}

                    <div className="grid grid-cols-2 gap-3">

                      <div className="mesh-detail-card">

                        <p className="mesh-detail-label">
                          Type
                        </p>

                        <p className="mesh-detail-value capitalize">
                          {selectedNode.category ||
                            selectedNode.type}
                        </p>

                      </div>

                      <div className="mesh-detail-card">

                        <p className="mesh-detail-label">
                          Interactions
                        </p>

                        <p className="mesh-detail-value">
                          {
                            selectedNode.interactionCount
                          }
                        </p>

                      </div>

                    </div>

                    {/* SOL */}

                    <div className="mesh-detail-card">

                      <p className="mesh-detail-label">
                        Total SOL Transferred
                      </p>

                      <p className="text-2xl font-bold text-cyan-300 mt-2">
                        {selectedNode.totalSolTransferred.toFixed(
                          4
                        )}{" "}
                        SOL
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

                      <span>
                        Open In Solscan
                      </span>

                    </a>

                    {/* TXS */}

                    {selectedNode.transactions
                      ?.length > 0 && (
                      <div>

                        <div className="flex items-center justify-between mb-3">

                          <h3 className="text-white font-semibold">
                            Recent Transactions
                          </h3>

                          <span className="text-xs text-slate-500">
                            {
                              selectedNode.transactions
                                .length
                            }{" "}
                            txs
                          </span>

                        </div>

                        <div className="space-y-3">

                          {selectedNode.transactions
                            .slice(0, 6)
                            .map(
                              (
                                tx,
                                index
                              ) => (
                                <div
                                  key={
                                    index
                                  }
                                  className="mesh-transaction-card"
                                >

                                  <div className="flex items-center gap-3">

                                    <div className="mesh-tx-icon">

                                      <ArrowRightLeft
                                        size={
                                          14
                                        }
                                      />

                                    </div>

                                    <div>

                                      <p className="text-white text-sm capitalize">
                                        {
                                          tx.type
                                        }
                                      </p>

                                      <p className="text-slate-500 text-xs">
                                        {new Date(
                                          tx.timestamp *
                                            1000
                                        ).toLocaleString()}
                                      </p>

                                    </div>

                                  </div>

                                  <div className="text-right">

                                    <p className="text-cyan-300 text-sm font-semibold">
                                      {tx.amount.toFixed(
                                        4
                                      )}{" "}
                                      SOL
                                    </p>

                                  </div>

                                </div>
                              )
                            )}

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