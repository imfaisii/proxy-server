import { CSSProperties } from "react";
import { MONO } from "@/lib/data";

// Repeated style snippets from the design, factored out for consistency.
export const card: CSSProperties = {
  background: "#fff",
  border: "1px solid #ebedf1",
  borderRadius: 14,
  boxShadow: "0 1px 2px rgba(16,24,40,.03)",
};

export const inputFocus: CSSProperties = {
  // Use the `border` shorthand (not borderColor) to match the base style and
  // avoid React's shorthand/non-shorthand mixing warning on focus re-render.
  border: "1px solid #2d68f5",
  boxShadow: "0 0 0 3px rgba(45,104,245,.12)",
};

export const mono: CSSProperties = { fontFamily: MONO };

export const tnum: CSSProperties = { fontFeatureSettings: "'tnum'" };
