"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { useHighlight, parseHighlightCommands } from "@/lib/highlight-context";
import { dispatchPageAction } from "@/lib/page-actions";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
}

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

interface PagePost {
  id: string;
  title: string;
  type: string;
  product?: string;
}

interface Props {
  pageContext?: { posts: PagePost[] };
}

const TOOL_LABELS: Record<string, string> = {
  navigate_page:    "페이지 이동",
  filter_community: "카테고리 필터",
  search_community: "커뮤니티 검색",
  highlight_posts:  "포스트 강조",
  open_write_modal: "글쓰기",
  clear_filters:    "필터 초기화",
};

const TOOL_ICONS: Record<string, string> = {
  navigate_page:    "→",
  filter_community: "🏷",
  search_community: "🔍",
  highlight_posts:  "✨",
  open_write_modal: "✏️",
  clear_filters:    "✕",
};

export default function ChatBot({ pageContext }: Props) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const { setHighlight, clearHighlight } = useHighlight();

  const STORAGE_KEY = "openresearch-chat-v1";

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      // Clear if older than 24h
      if (parsed.ts && Date.now() - parsed.ts > 24 * 3600000) return [];
      return parsed.messages ?? [];
    } catch { return []; }
  });
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Persist messages to localStorage
  useEffect(() => {
    if (messages.length === 0) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, ts: Date.now() }));
    } catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 패널 열릴 때 즉시 최하단으로
  useEffect(() => {
    if (!isOpen) return;
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    }, 50);
  }, [isOpen]);

  // Click outside → close panel (handled via overlay below, no JS listener needed)
  useEffect(() => {
    if (!isOpen) return;
    // Keep empty — overlay handles closing
  }, [isOpen, clearHighlight]);

  const executeToolCall = useCallback((toolCall: ToolCall) => {
    const { name, args } = toolCall;
    switch (name) {
      case "navigate_page":
        window.location.href = `${args.page === "community" ? "/" : "/" + args.page}`;
        break;
      case "filter_community":
        dispatchPageAction({ type: "filter_community", filter: String(args.filter ?? "all") });
        break;
      case "search_community":
        dispatchPageAction({ type: "search_community", query: String(args.query ?? "") });
        break;
      case "highlight_posts":
        setHighlight({ postIds: (args.post_ids as string[]) ?? [], sections: (args.sections as string[]) ?? [], message: null });
        break;
      case "open_write_modal": {
        // Navigate to write page with draft as query params
        const p = new URLSearchParams();
        if (args.title)    p.set("title",    String(args.title));
        if (args.content)  p.set("content",  String(args.content));
        if (args.category) p.set("category", String(args.category));
        const qs = p.toString();
        window.location.href = `/write${qs ? `?${qs}` : ""}`;
        break;
      }
      case "clear_filters":
        dispatchPageAction({ type: "clear_filters" });
        break;
      case "ban_user":
        fetch("/api/admin/ban", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: args.user_id, reason: args.reason }),
        }).catch(console.error);
        break;
    }
  }, [setHighlight]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Always open panel when sending
    setIsOpen(true);

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "", toolCalls: [] }]);

    try {
      const apiMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, locale, pageContext }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.message ?? "오류가 발생했어요.";
        // Show login prompt for anon rate limit
        const suffix = errData.requiresLogin
          ? "\n\n로그인하면 더 많은 대화가 가능해요." : "";
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: msg + suffix } : m));
        setIsLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              fullText += parsed.text;
              const { cleaned, postIds, sections } = parseHighlightCommands(fullText);
              if (postIds.length > 0 || sections.length > 0) {
                setHighlight({ postIds, sections, message: null });
                fullText = cleaned;
              }
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: fullText } : m));
            }
            if (parsed.tool_call) {
              const tc: ToolCall = { name: parsed.tool_call.name, args: parsed.tool_call.args };
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, toolCalls: [...(m.toolCalls ?? []), tc] } : m));
              executeToolCall(tc);
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err: unknown) {
      let errMsg = "오류가 발생했어요. 다시 시도해주세요.";
      try {
        const res = err as Response;
        if (res && typeof res.json === "function") {
          const data = await res.json();
          if (data.error === "rate_limited") errMsg = data.message;
          else if (data.error === "banned") errMsg = data.message;
        }
      } catch { /* ignore */ }
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: errMsg } : m));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/* Spacer */}
      <div style={{ height: 88 }} />

      {/* Full-screen overlay — z-[49] so it's below panel/bar (z-50) but catches left/right clicks */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[49]"
          onClick={() => { setIsOpen(false); clearHighlight(); }}
        />
      )}

      {/* Root container — z-50, but panel & bar sit above overlay */}
      <div id="chatbot-root" className="fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center px-4 pb-4"
        onClick={(e) => {
          // Close if clicking the background of chatbot-root (not the panel or bar)
          if (e.target === e.currentTarget) { setIsOpen(false); clearHighlight(); }
        }}>

        {/* Message panel — slides up above the bar */}
        {isOpen && messages.length > 0 && (
          <div
            className="w-full max-w-2xl mb-2 rounded-3xl overflow-hidden animate-slide-up"
            style={{
              height: 380,
              background: "rgba(255,255,255,0.96)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(71,74,255,0.15)",
              boxShadow: "0 8px 48px rgba(71,74,255,0.12), 0 2px 8px rgba(0,0,0,0.06)",
            }}>

            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-light)]">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full overflow-hidden" style={{ aspectRatio: "1/1" }}>
                  <Image src="/oprs_logo.jpeg" alt="OR" width={20} height={20} className="w-full h-full object-contain" />
                </div>
                <span className="text-xs font-semibold">OpenResearch AI</span>
                <span className="text-[10px] text-[var(--text-tertiary)]">· 페이지 제어 · 검색 · 질문</span>
              </div>
              <button onClick={() => { setIsOpen(false); clearHighlight(); }}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[var(--surface)] text-[var(--text-tertiary)]">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M9.5 1.5l-8 8M1.5 1.5l8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="overflow-y-auto px-4 py-3 space-y-3" style={{ height: 380 - 44 }}>
              {messages.map((msg) => (
                <div key={msg.id}
                  className={cn("flex gap-2 animate-fade-in", msg.role === "user" ? "justify-end" : "justify-start")}>
                  {msg.role === "assistant" && (
                    <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 mt-0.5" style={{ aspectRatio: "1/1" }}>
                      <Image src="/oprs_logo.jpeg" alt="OR" width={20} height={20} className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1 max-w-[82%]">
                    {msg.toolCalls?.map((tc, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-medium"
                        style={{ background: "var(--purple-light)", color: "var(--purple)" }}>
                        <span>{TOOL_ICONS[tc.name] ?? "⚡"}</span>
                        <span>{TOOL_LABELS[tc.name] ?? tc.name}</span>
                        {tc.args?.filter ? <span className="opacity-60">· {String(tc.args.filter)}</span> : null}
                        {tc.args?.query ? <span className="opacity-60">· &ldquo;{String(tc.args.query)}&rdquo;</span> : null}
                        {tc.args?.page ? <span className="opacity-60">· {String(tc.args.page)}</span> : null}
                        {tc.args?.title ? <span className="opacity-60">· {String(tc.args.title).slice(0, 20)}</span> : null}
                        <span className="ml-auto">✓</span>
                      </div>
                    ))}
                    {(msg.content || (msg.role === "assistant" && isLoading && msg.id === messages[messages.length - 1]?.id)) && (
                      <div className={cn(
                        "px-3 py-2 rounded-2xl text-xs leading-relaxed",
                        msg.role === "user"
                          ? "bg-[var(--foreground)] text-white rounded-br-sm"
                          : "bg-[var(--surface)] text-[var(--foreground)] rounded-bl-sm border border-[var(--border-light)]"
                      )}>
                        {msg.content ? (
                          msg.role === "user" ? (
                            <span>{msg.content}</span>
                          ) : (
                            <ReactMarkdown components={{
                              p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>,
                              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                              ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>,
                              li: ({ children }) => <li>{children}</li>,
                              a: ({ href, children }) => (
                                <a href={href} target="_blank" rel="noopener noreferrer"
                                  className="underline hover:opacity-80" style={{ color: "var(--purple)" }}>
                                  {children}
                                </a>
                              ),
                              code: ({ children }) => (
                                <code className="px-1 py-0.5 rounded text-[10px] font-mono"
                                  style={{ background: "rgba(71,74,255,0.08)", color: "var(--purple)" }}>
                                  {children}
                                </code>
                              ),
                            }}>
                              {msg.content}
                            </ReactMarkdown>
                          )
                        ) : (
                          <span className="flex gap-1 items-center py-0.5">
                            {[0, 150, 300].map(d => (
                              <span key={d} className="w-1 h-1 rounded-full bg-[var(--text-tertiary)] animate-bounce"
                                style={{ animationDelay: `${d}ms` }} />
                            ))}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Single bottom input bar */}
        <div
          className="w-full max-w-2xl flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200"
          style={{
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(20px)",
            border: isOpen ? "1.5px solid rgba(71,74,255,0.5)" : "1px solid var(--border)",
            boxShadow: isOpen
              ? "0 0 0 4px rgba(71,74,255,0.08), 0 4px 24px rgba(71,74,255,0.12)"
              : "0 2px 16px rgba(0,0,0,0.06)",
          }}>

          <div className="w-6 h-6 rounded-full overflow-hidden shrink-0" style={{ aspectRatio: "1/1" }}>
            <Image src="/oprs_logo.jpeg" alt="OR" width={24} height={24} className="w-full h-full object-contain" />
          </div>

          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
            placeholder={t("placeholder")}
            rows={1}
            className="flex-1 bg-transparent text-[16px] resize-none outline-none placeholder:text-[var(--text-tertiary)] leading-relaxed"
            style={{ maxHeight: "100px", minHeight: "22px" }}
          />

          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
            style={{
              background: input.trim() && !isLoading
                ? "linear-gradient(135deg, #474aff, #a54bff)"
                : "var(--surface)",
            }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 11V3M3 7l4-4 4 4"
                stroke={input.trim() && !isLoading ? "white" : "var(--text-tertiary)"}
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

      </div>
    </>
  );
}
