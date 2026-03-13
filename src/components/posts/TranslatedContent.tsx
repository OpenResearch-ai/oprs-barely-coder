"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { linkify } from "@/lib/linkify";

interface TranslatedComment {
  id: string;
  content: string | null;
}

interface Props {
  postId: string;
  originalTitle: string;
  originalContent: string | null;
  sourceUrl?: string | null;
  onCommentsTranslated?: (comments: TranslatedComment[]) => void;
}

const LS_KEY = (postId: string, locale: string) => `or-tr-${postId}-${locale}`;

function readLocalCache(postId: string, locale: string): { title?: string; content?: string } | null {
  try {
    const stored = localStorage.getItem(LS_KEY(postId, locale));
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

function writeLocalCache(postId: string, locale: string, data: { title?: string; content?: string }) {
  try {
    localStorage.setItem(LS_KEY(postId, locale), JSON.stringify(data));
  } catch { /* ignore */ }
}

export default function TranslatedContent({ postId, originalTitle, originalContent, sourceUrl, onCommentsTranslated }: Props) {
  const locale = useLocale();
  const t = useTranslations("postDetail");

  // Read localStorage synchronously before first render — eliminates flicker on repeat visits
  const localCache = useMemo(() => {
    if (typeof window === "undefined" || locale === "ko") return null;
    return readLocalCache(postId, locale);
  }, []);

  const [title, setTitle] = useState(localCache?.title ?? originalTitle);
  const [content, setContent] = useState<string | null>(localCache?.content ?? originalContent);
  const [bodyStatus, setBodyStatus] = useState<"idle" | "loading" | "done" | "error">(
    localCache?.content ? "done" : "idle"
  );

  // Update browser title for Google Analytics
  useEffect(() => {
    document.title = `${title} | OpenResearch`;
    return () => { document.title = "OpenResearch"; };
  }, [title]);

  useEffect(() => {
    if (locale === "ko") return;

    // If we already have full local cache, skip quick fetch and only do full (for comments)
    if (localCache?.title && localCache?.content) {
      fetch(`/api/posts/${postId}/translate?locale=${locale}`)
        .then(r => r.json())
        .then(data => { onCommentsTranslated?.(data.comments ?? []); })
        .catch(() => {});
      return;
    }

    // Step 1: Quick fetch — DB cache only, instant
    fetch(`/api/posts/${postId}/translate?locale=${locale}&quick=1`)
      .then(r => r.json())
      .then(data => {
        if (data.post?.title) {
          setTitle(data.post.title);
          document.title = `${data.post.title} | OpenResearch`;
        }
        if (data.post?.content) {
          setContent(data.post.content);
          setBodyStatus("done");
          writeLocalCache(postId, locale, data.post);
        } else {
          setBodyStatus("loading");
        }
      })
      .catch(() => setBodyStatus("loading"));

    // Step 2: Full translation (Gemini if needed)
    fetch(`/api/posts/${postId}/translate?locale=${locale}`)
      .then(r => r.json())
      .then(data => {
        if (data.post) {
          const t = data.post.title ?? originalTitle;
          const c = data.post.content ?? originalContent;
          setTitle(t);
          setContent(c);
          setBodyStatus("done");
          writeLocalCache(postId, locale, { title: t, content: c ?? undefined });
          onCommentsTranslated?.(data.comments ?? []);
        } else {
          setBodyStatus("error");
        }
      })
      .catch(() => setBodyStatus("error"));
  }, [postId, locale]);

  return (
    <div>
      {/* Title */}
      <h1 className="text-2xl font-bold leading-snug mb-1">{title}</h1>

      {/* Source URL */}
      {sourceUrl && (() => {
        try {
          const domain = new URL(sourceUrl).hostname.replace("www.", "");
          return (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--purple)] transition-colors mb-3">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 8.5L8.5 1.5M8.5 1.5H3M8.5 1.5V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {domain}
            </a>
          );
        } catch { return null; }
      })()}

      {/* Body translation status */}
      {locale !== "ko" && bodyStatus === "loading" && (
        <div className="flex items-center gap-2 my-3 text-xs text-[var(--text-tertiary)]">
          <div className="w-3 h-3 rounded-full border border-[var(--purple)] border-t-transparent animate-spin" />
          {t("translating")}
        </div>
      )}
      {locale !== "ko" && bodyStatus === "done" && (
        <div className="flex items-center gap-1 my-3 text-[10px] text-[var(--text-tertiary)]">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M4 6l1.5 1.5L8 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t("translated")}
        </div>
      )}

      {/* Content */}
      {content && (
        <div className="text-[15px] leading-relaxed text-[var(--foreground)] whitespace-pre-wrap">
          {linkify(content).map((part, i) =>
            part.type === "link" ? (
              <a key={i} href={part.href} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium border-b-2 transition-colors"
                style={{ color: "var(--purple)", borderColor: "rgba(71,74,255,0.3)" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--purple)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(71,74,255,0.3)")}>
                <svg width="11" height="11" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M1.5 8.5L8.5 1.5M8.5 1.5H3M8.5 1.5V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {part.content}
              </a>
            ) : (
              <span key={i}>{part.content}</span>
            )
          )}
        </div>
      )}
    </div>
  );
}
