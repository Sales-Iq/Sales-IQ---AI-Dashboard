import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChartDataPoint } from "../data/demoData";

interface SalesChartProps {
  data: ChartDataPoint[];
  height?: number;
  showLabels?: boolean;
}

export const SalesChart: React.FC<SalesChartProps> = ({
  data,
  height = 200,
  showLabels = true,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const maxRevenue = Math.max(...data.map((d) => d.revenue)) * 1.15;
  const minRevenue = 0;
  const paddingX = 20;
  const paddingY = 24;
  const width = 600;

  // Generate SVG coordinates
  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * (width - paddingX * 2);
    const y =
      height -
      paddingY -
      ((d.revenue - minRevenue) / (maxRevenue - minRevenue)) *
        (height - paddingY * 2);
    return { x, y, ...d };
  });

  // Build bezier curve path
  const linePath = points.reduce((acc, point, i, arr) => {
    if (i === 0) return `M ${point.x},${point.y}`;
    const prev = arr[i - 1];
    const cpX = (prev.x + point.x) / 2;
    return `${acc} C ${cpX},${prev.y} ${cpX},${point.y} ${point.x},${point.y}`;
  }, "");

  // Area closing path
  const areaPath = `${linePath} L ${points[points.length - 1].x},${
    height - paddingY
  } L ${points[0].x},${height - paddingY} Z`;

  return (
    <div className="relative w-full overflow-hidden select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
      >
        <defs>
          <linearGradient id="mintAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.32" />
            <stop offset="60%" stopColor="#0EA5E9" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="mintLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>

        {/* Horizontal subtle guide lines */}
        {[0.25, 0.5, 0.75].map((ratio) => {
          const y = height - paddingY - ratio * (height - paddingY * 2);
          return (
            <line
              key={ratio}
              x1={paddingX}
              y1={y}
              x2={width - paddingX}
              y2={y}
              stroke="rgba(255, 255, 255, 0.05)"
              strokeDasharray="4 4"
            />
          );
        })}

        {/* Area fill */}
        <motion.path
          d={areaPath}
          fill="url(#mintAreaGrad)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />

        {/* Smooth line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke="url(#mintLineGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i} className="cursor-pointer">
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIndex === i ? 6 : 3.5}
              fill="#090D14"
              stroke="#38BDF8"
              strokeWidth={hoveredIndex === i ? 2.5 : 1.5}
              className="transition-all duration-200"
            />
            {/* Transparent hover hit target */}
            <rect
              x={p.x - 20}
              y={0}
              width={40}
              height={height}
              fill="transparent"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          </g>
        ))}
      </svg>

      {/* Floating Tooltip */}
      <AnimatePresence>
        {hoveredIndex !== null && points[hoveredIndex] && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-20 pointer-events-none px-3 py-1.5 rounded-lg glass-panel text-xs"
            style={{
              left: `${(points[hoveredIndex].x / width) * 100}%`,
              top: `${(points[hoveredIndex].y / height) * 100 - 35}%`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="font-semibold text-white">
              ₹{points[hoveredIndex].revenue.toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-sky-400">
              {points[hoveredIndex].orders} orders ({points[hoveredIndex].time})
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Time axis labels */}
      {showLabels && (
        <div className="flex justify-between px-5 pt-2 text-[11px] font-medium text-slate-500">
          {data.map((d, i) => (
            <span key={i}>{d.time}</span>
          ))}
        </div>
      )}
    </div>
  );
};
