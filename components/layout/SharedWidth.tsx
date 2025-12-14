"use client";

import { useEffect, useState, type ReactNode } from "react";

export default function SharedWidth({
  anchorId,
  children,
  className = "",
}: {
  anchorId: string;
  children: ReactNode;
  className?: string;
}) {
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const anchor = document.getElementById(anchorId);
    if (!anchor) return;

    const apply = () => {
      const rect = anchor.getBoundingClientRect();
      setWidth(rect.width);
    };

    // Initial and observe changes
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(anchor);
    window.addEventListener("resize", apply);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, [anchorId]);

  return (
    <div
      className={className}
      style={width ? { width, marginLeft: "auto", marginRight: "auto" } : undefined}
    >
      {children}
    </div>
  );
}
