"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface ToastNotification {
  id: string;
  postId: string;
  postTitle: string;
  commenterName: string;
  commentContent: string;
}

interface Props {
  notifications: ToastNotification[];
  onDismiss: (id: string) => void;
}

function Toast({ n, onDismiss }: { n: ToastNotification; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Slide in
    requestAnimationFrame(() => setVisible(true));
    // Auto-dismiss after 5s
    const timer = setTimeout(() => dismiss(), 5000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setLeaving(true);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      onClick={() => { window.location.href = `/posts/${n.postId}`; }}
      className={cn(
        "flex items-start gap-3 p-4 rounded-2xl cursor-pointer transition-all duration-300",
        "w-80 max-w-[calc(100vw-2rem)]",
        visible && !leaving ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
      style={{
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(71,74,255,0.2)",
        boxShadow: "0 8px 32px rgba(71,74,255,0.12), 0 2px 8px rgba(0,0,0,0.06)",
      }}>
      {/* Logo */}
      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0" style={{ aspectRatio: "1/1" }}>
        <Image src="/oprs_logo.jpeg" alt="OR" width={32} height={32} className="w-full h-full object-contain" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[var(--foreground)] mb-0.5">
          <span style={{ color: "var(--purple)" }}>{n.commenterName}</span>님이 댓글을 달았어요
        </p>
        <p className="text-[11px] text-[var(--text-secondary)] truncate mb-1">
          {n.postTitle}
        </p>
        <p className="text-[11px] text-[var(--text-tertiary)] line-clamp-1">
          "{n.commentContent}"
        </p>
      </div>

      {/* Close */}
      <button
        onClick={e => { e.stopPropagation(); dismiss(); }}
        className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full hover:bg-[var(--surface)] text-[var(--text-tertiary)] transition-all mt-0.5">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M8 2L2 8M2 2l6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}

export default function NotificationToast({ notifications, onDismiss }: Props) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {notifications.map(n => (
        <div key={n.id} className="pointer-events-auto">
          <Toast n={n} onDismiss={() => onDismiss(n.id)} />
        </div>
      ))}
    </div>
  );
}
