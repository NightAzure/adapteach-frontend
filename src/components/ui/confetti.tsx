"use client";

import confetti from "canvas-confetti";

/**
 * Trigger a confetti burst — call this imperatively on correct submission.
 * @param origin  {x, y} in 0-1 viewport fraction (defaults to center-top)
 */
export function triggerConfetti(origin?: { x?: number; y?: number }) {
  const x = origin?.x ?? 0.5;
  const y = origin?.y ?? 0.3;

  void confetti({
    particleCount: 90,
    spread: 70,
    origin: { x, y },
    colors: ["#26a98f", "#3cc5a8", "#de7a39", "#f09152", "#f8f2e7", "#ddf5ef"],
    scalar: 1.1,
    gravity: 0.9,
  });

  // Second burst with slight delay for depth
  setTimeout(() => {
    void confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0.15, y },
      colors: ["#26a98f", "#1a8f79", "#ddf5ef"],
    });
    void confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 0.85, y },
      colors: ["#de7a39", "#b65d24", "#f8f2e7"],
    });
  }, 180);
}
