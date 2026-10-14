"use client";

import { useSyncExternalStore } from "react";

let nowMs = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (nowMs === 0) {
    nowMs = Date.now();
    queueMicrotask(emit);
  }
  const timer = window.setInterval(() => {
    nowMs = Date.now();
    emit();
  }, 1000);
  return () => {
    listeners.delete(listener);
    window.clearInterval(timer);
  };
}

function getSnapshot() {
  return nowMs;
}

function getServerSnapshot() {
  return 0;
}

export function useNow() {
  const ms = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return ms ? new Date(ms) : null;
}
