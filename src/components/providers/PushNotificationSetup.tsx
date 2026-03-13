"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const DISMISSED_KEY = "or-push-dismissed";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function registerPush() {
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    });
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")!))),
          auth:   btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")!))),
        },
      }),
    });
  } catch (err) {
    console.error("Push registration failed:", err);
  }
}

export default function PushNotificationSetup() {
  const t = useTranslations("push");
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

    const currentPerm = Notification.permission;
    if (currentPerm === "granted") { registerPush(); return; }
    if (currentPerm === "denied") return;

    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    });
  }, []);

  const requestPermission = async () => {
    setShowBanner(false);
    const perm = await Notification.requestPermission();
    if (perm === "granted") await registerPush();
  };

  const dismiss = () => {
    setShowBanner(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  };

  if (!showBanner) return null;

  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[90] animate-slide-up"
      style={{ width: "min(360px, calc(100vw - 2rem))" }}>
      <div className="rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(71,74,255,0.15)",
          boxShadow: "0 8px 32px rgba(71,74,255,0.12), 0 2px 8px rgba(0,0,0,0.06)",
        }}>
        <div className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="text-2xl shrink-0">🔔</div>
            <div>
              <p className="text-sm font-bold mb-0.5">{t("title")}</p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{t("desc")}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={requestPermission}
              className="flex-1 py-2 text-xs font-semibold text-white rounded-xl transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #474aff, #a54bff)" }}>
              {t("allow")}
            </button>
            <button onClick={dismiss}
              className="px-4 py-2 text-xs text-[var(--text-secondary)] rounded-xl hover:bg-[var(--surface)] transition-all">
              {t("later")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
