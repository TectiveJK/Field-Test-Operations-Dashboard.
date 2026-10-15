"use client";

import { useEffect } from "react";
import { APP_VERSION } from "@/lib/version";

function basePath() {
  return process.env.NEXT_PUBLIC_BASE_PATH ?? "";
}

function swUrl() {
  return `${basePath()}/sw.js?v=${APP_VERSION}`;
}

function reloadWithBust() {
  const next = new URL(window.location.href);
  next.searchParams.set("ftod", APP_VERSION);
  window.location.replace(next.toString());
}

export async function forceAppUpdate() {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch {
    /* still reload so Safari drops the sticky shell */
  }
  reloadWithBust();
}

function isCurrentWorker(registration: ServiceWorkerRegistration) {
  const script =
    registration.active?.scriptURL ||
    registration.waiting?.scriptURL ||
    registration.installing?.scriptURL ||
    "";
  return script.includes(`sw.js?v=${APP_VERSION}`);
}

async function dropStaleWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) => !isCurrentWorker(registration))
      .map((registration) => registration.unregister())
  );
}

async function checkPublishedVersion() {
  try {
    const response = await fetch(`${basePath()}/version.json?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok) return;
    const data = (await response.json()) as { version?: string };
    if (!data.version || data.version === APP_VERSION) return;
    const tried = sessionStorage.getItem("ftod-tried-update");
    if (tried === data.version) return;
    sessionStorage.setItem("ftod-tried-update", data.version);
    await forceAppUpdate();
  } catch {
    /* offline: keep the cached shell */
  }
}

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void dropStaleWorkers()
      .then(() => navigator.serviceWorker.register(swUrl(), { updateViaCache: "none" }))
      .then((registration) => {
        const check = () => {
          void registration.update().catch(() => undefined);
          void checkPublishedVersion();
        };
        check();
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") check();
        });
        window.addEventListener("focus", check);
        window.addEventListener("pageshow", check);
        window.setInterval(check, 20000);
      })
      .catch(() => {
        /* field tool still works without the worker */
      });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }, []);
  return null;
}
