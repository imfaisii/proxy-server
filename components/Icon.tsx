import React from "react";

// SVG icon parts, ported verbatim from the source design's icon table.
type IconPart = {
  t?: "path" | "rect" | "circle" | "line" | "polyline" | "polygon";
} & Record<string, string | number>;

export const ICONS: Record<string, IconPart[]> = {
  logo: [
    { t: "path", d: "M12 2l7 2.6v5.7c0 4.4-3 7.6-7 9.7-4-2.1-7-5.3-7-9.7V4.6z" },
    {
      t: "path",
      d: "M12 7.6l1.4 2.9 3.1.4-2.3 2.2.6 3.1L12 14.7l-2.8 1.5.6-3.1-2.3-2.2 3.1-.4z",
    },
  ],
  grid: [
    { t: "rect", x: 3, y: 3, width: 7, height: 7, rx: 1.4 },
    { t: "rect", x: 14, y: 3, width: 7, height: 7, rx: 1.4 },
    { t: "rect", x: 14, y: 14, width: 7, height: 7, rx: 1.4 },
    { t: "rect", x: 3, y: 14, width: 7, height: 7, rx: 1.4 },
  ],
  activity: [{ d: "M3 12h4l3 8 4-16 3 8h4" }],
  globe: [
    { t: "circle", cx: 12, cy: 12, r: 9 },
    { d: "M3 12h18" },
    { d: "M12 3c2.6 2.7 4 6 4 9s-1.4 6.3-4 9c-2.6-2.7-4-6-4-9s1.4-6.3 4-9z" },
  ],
  mega: [
    { d: "M3 11a1 1 0 0 1 1-1h3l9-5v16l-9-5H4a1 1 0 0 1-1-1z" },
    { d: "M8 16v2.5a2 2 0 0 0 4 0V16" },
    { d: "M20 9c1 1 1 5 0 6" },
  ],
  sliders: [
    { t: "line", x1: 4, y1: 21, x2: 4, y2: 13 },
    { t: "line", x1: 4, y1: 9, x2: 4, y2: 3 },
    { t: "line", x1: 12, y1: 21, x2: 12, y2: 11 },
    { t: "line", x1: 12, y1: 7, x2: 12, y2: 3 },
    { t: "line", x1: 20, y1: 21, x2: 20, y2: 15 },
    { t: "line", x1: 20, y1: 11, x2: 20, y2: 3 },
    { t: "line", x1: 1, y1: 13, x2: 7, y2: 13 },
    { t: "line", x1: 9, y1: 7, x2: 15, y2: 7 },
    { t: "line", x1: 17, y1: 15, x2: 23, y2: 15 },
  ],
  logout: [
    { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" },
    { d: "M16 17l5-5-5-5" },
    { t: "line", x1: 21, y1: 12, x2: 9, y2: 12 },
  ],
  copy: [
    { t: "rect", x: 9, y: 9, width: 12, height: 12, rx: 2.4 },
    { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" },
  ],
  check: [{ d: "M20 6L9 17l-5-5" }],
  eye: [
    { d: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" },
    { t: "circle", cx: 12, cy: 12, r: 3 },
  ],
  eyeoff: [
    {
      d: "M9.9 4.2A9 9 0 0 1 12 4c6.5 0 10 7 10 7a17 17 0 0 1-3 3.6M6.6 6.6A17 17 0 0 0 2 11s3.5 7 10 7a9 9 0 0 0 4-.9",
    },
    { t: "line", x1: 2, y1: 2, x2: 22, y2: 22 },
  ],
  search: [
    { t: "circle", cx: 11, cy: 11, r: 7 },
    { t: "line", x1: 21, y1: 21, x2: 16.6, y2: 16.6 },
  ],
  down: [
    { t: "line", x1: 12, y1: 5, x2: 12, y2: 19 },
    { d: "M19 12l-7 7-7-7" },
  ],
  up: [
    { t: "line", x1: 12, y1: 19, x2: 12, y2: 5 },
    { d: "M5 12l7-7 7 7" },
  ],
  shield: [
    { d: "M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z" },
    { t: "line", x1: 12, y1: 8, x2: 12, y2: 12.5 },
    { t: "line", x1: 12, y1: 16, x2: 12, y2: 16 },
  ],
  wifi: [
    { d: "M5 12.5a10 10 0 0 1 14 0" },
    { d: "M8.5 16a5 5 0 0 1 7 0" },
    { t: "line", x1: 12, y1: 19.4, x2: 12, y2: 19.4 },
  ],
  arrow: [
    { t: "line", x1: 5, y1: 12, x2: 19, y2: 12 },
    { d: "M13 6l6 6-6 6" },
  ],
  lock: [
    { t: "rect", x: 5, y: 11, width: 14, height: 10, rx: 2 },
    { d: "M8 11V7a4 4 0 0 1 8 0v4" },
  ],
  alert: [
    { t: "circle", cx: 12, cy: 12, r: 9 },
    { t: "line", x1: 12, y1: 8, x2: 12, y2: 12.5 },
    { t: "line", x1: 12, y1: 16, x2: 12, y2: 16 },
  ],
  chevron: [{ d: "M9 6l6 6-6 6" }],
  close: [
    { t: "line", x1: 18, y1: 6, x2: 6, y2: 18 },
    { t: "line", x1: 6, y1: 6, x2: 18, y2: 18 },
  ],
  plus: [
    { t: "line", x1: 12, y1: 5, x2: 12, y2: 19 },
    { t: "line", x1: 5, y1: 12, x2: 19, y2: 12 },
  ],
  clock: [
    { t: "circle", cx: 12, cy: 12, r: 9 },
    { d: "M12 7v5l3 2" },
  ],
};

export function Icon({
  name,
  size = 18,
  sw = 1.7,
}: {
  name: keyof typeof ICONS | string;
  size?: number;
  sw?: number;
}) {
  const spec = ICONS[name] || [];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {spec.map((part, i) => {
        const { t = "path", ...rest } = part;
        return React.createElement(t, { key: i, ...rest });
      })}
    </svg>
  );
}
