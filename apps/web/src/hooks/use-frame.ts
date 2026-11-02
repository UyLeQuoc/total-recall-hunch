import { useEffect, useState } from "react";

const FRAME_MS = 50;

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useFrame(active: boolean): number {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active || reducedMotion()) return;
    const start = performance.now();
    let raf = 0;
    let last = -1;
    const loop = (now: number) => {
      const step = Math.floor((now - start) / FRAME_MS);
      if (step !== last) {
        last = step;
        setElapsed(now - start);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return elapsed;
}

export function useEase(durationMs: number, key: unknown): number {
  const [progress, setProgress] = useState(reducedMotion() ? 1 : 0);
  useEffect(() => {
    if (reducedMotion()) {
      setProgress(1);
      return;
    }
    void key;
    const start = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      setProgress(1 - (1 - t) ** 3);
      if (t < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, key]);
  return progress;
}

export function useNow(intervalMs: number, active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, active]);
  return now;
}
