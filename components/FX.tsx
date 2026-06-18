"use client";

import React, { CSSProperties, useState } from "react";

type Tag = "button" | "div" | "input" | "textarea" | "span" | "aside";

type FXProps = {
  as?: Tag;
  s?: CSSProperties;
  hover?: CSSProperties;
  focus?: CSSProperties;
  active?: CSSProperties;
  children?: React.ReactNode;
} & Omit<React.AllHTMLAttributes<HTMLElement>, "as" | "style">;

/**
 * Inline-style element that layers :hover / :focus / :active styles on top of a
 * base style — the design uses style-hover/style-focus/style-active attributes,
 * and this is the React equivalent. Falls back to a plain element when no
 * interaction styles are given.
 */
export function FX({
  as = "button",
  s,
  hover,
  focus,
  active,
  children,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onMouseUp,
  onFocus,
  onBlur,
  ...rest
}: FXProps) {
  const [h, setH] = useState(false);
  const [f, setF] = useState(false);
  const [a, setA] = useState(false);

  const style: CSSProperties = {
    ...s,
    ...(h && hover),
    ...(f && focus),
    ...(a && active),
  };

  const Tag = as as React.ElementType;

  return (
    <Tag
      {...rest}
      style={style}
      onMouseEnter={(e: React.MouseEvent<HTMLElement>) => {
        if (hover) setH(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLElement>) => {
        if (hover) setH(false);
        if (active) setA(false);
        onMouseLeave?.(e);
      }}
      onMouseDown={(e: React.MouseEvent<HTMLElement>) => {
        if (active) setA(true);
        onMouseDown?.(e);
      }}
      onMouseUp={(e: React.MouseEvent<HTMLElement>) => {
        if (active) setA(false);
        onMouseUp?.(e);
      }}
      onFocus={(e: React.FocusEvent<HTMLElement>) => {
        if (focus) setF(true);
        onFocus?.(e);
      }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        if (focus) setF(false);
        onBlur?.(e);
      }}
    >
      {children}
    </Tag>
  );
}
