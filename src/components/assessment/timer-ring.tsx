"use client";

import { useEffect, useRef, useState } from "react";

interface TimerRingProps {
  /** Total duration in seconds */
  durationSeconds: number;
  /** ISO timestamp when the attempt started */
  startedAt: string;
  /** ISO timestamp when the attempt expires */
  expiresAt: string;
  /** Called when time runs out */
  onExpired?: () => void;
  size?: number;
  strokeWidth?: number;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatTime(seconds: number) {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${pad(m)}:${pad(s)}`;
}

function ringColor(fraction: number): string {
  if (fraction > 0.5) return "var(--brand-500)";
  if (fraction > 0.2) return "#f59e0b"; // amber-400
  return "#ef4444"; // red-500
}

export function TimerRing({
  durationSeconds,
  startedAt,
  expiresAt,
  onExpired,
  size = 96,
  strokeWidth = 7,
}: TimerRingProps) {
  const r = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * r;

  const [remaining, setRemaining] = useState<number>(() => {
    const now = Date.now();
    const exp = new Date(expiresAt).getTime();
    return Math.max(0, Math.round((exp - now) / 1000));
  });

  const expiredRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const exp = new Date(expiresAt).getTime();
      const rem = Math.max(0, Math.round((exp - now) / 1000));
      setRemaining(rem);
      if (rem === 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpired?.();
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpired]);

  const fraction = durationSeconds > 0 ? remaining / durationSeconds : 0;
  const offset = circumference * (1 - fraction);
  const color = ringColor(fraction);

  const center = size / 2;

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Time remaining: ${formatTime(remaining)}`}
      >
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc — starts at top, rotated -90deg */}
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.4s ease" }}
        />
        {/* Time text */}
        <text
          x={center}
          y={center + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.175}
          fontWeight="600"
          fontFamily="var(--font-body), Segoe UI, sans-serif"
          fill={color}
          style={{ transition: "fill 0.4s ease" }}
        >
          {formatTime(remaining)}
        </text>
      </svg>
      {fraction < 0.2 && remaining > 0 && (
        <span className="text-[11px] font-semibold text-red-500 animate-pulse">
          Running out!
        </span>
      )}
    </div>
  );
}
