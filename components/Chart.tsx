// Active-connections area chart — ported from the design's buildChart().
// Renders a smooth filled line over a faint baseline grid, with a dashed
// "now" marker at the right edge.
export function TrafficChart({ data }: { data: number[] }) {
  if (!data || !data.length) return null;

  const w = 700;
  const h = 190;
  const max = Math.max(...data) * 1.08;
  const min = Math.min(...data) * 0.92;
  const X = (i: number) => (i / (data.length - 1)) * w;
  const Y = (val: number) => h - ((val - min) / (max - min || 1)) * (h - 8) - 4;

  let line = "";
  data.forEach((val, i) => {
    line += (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(val).toFixed(1) + " ";
  });
  const area = line + `L ${w} ${h} L 0 ${h} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id="mtgGrad" x1={0} y1={0} x2={0} y2={1}>
          <stop offset="0%" stopColor="#2d68f5" stopOpacity={0.16} />
          <stop offset="100%" stopColor="#2d68f5" stopOpacity={0} />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g, i) => (
        <line
          key={i}
          x1={0}
          y1={h * g}
          x2={w}
          y2={h * g}
          stroke="#f0f2f5"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <path d={area} fill="url(#mtgGrad)" />
      <path
        d={line}
        fill="none"
        stroke="#2d68f5"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={w}
        y1={0}
        x2={w}
        y2={h}
        stroke="#2d68f5"
        strokeWidth={1}
        strokeDasharray="3 3"
        opacity={0.4}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
