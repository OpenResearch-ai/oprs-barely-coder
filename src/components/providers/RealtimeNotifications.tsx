"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import NotificationToast, { type ToastNotification } from "@/components/ui/NotificationToast";

export default function RealtimeNotifications() {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let userId: string | null = null;
    let myPostIds: Set<string> = new Set();

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;

      // 내가 작성한 포스트 ID 목록 로드
      const { data: posts } = await supabase
        .from("posts")
        .select("id, title")
        .eq("author_id", user.id)
        .eq("status", "active");

      if (!posts?.length) return;

      const postMap = new Map(posts.map(p => [p.id, p.title]));
      myPostIds = new Set(posts.map(p => p.id));

      // Realtime 구독
      const channel = supabase
        .channel("comment-notifications")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "comments" },
          (payload) => {
            const comment = payload.new as {
              id: string;
              post_id: string;
              author_id: string | null;
              author_name: string;
              content: string;
            };

            // 내 글에 달린 댓글 && 내가 쓴 댓글이 아닌 것
            if (
              myPostIds.has(comment.post_id) &&
              comment.author_id !== userId
            ) {
              const postTitle = postMap.get(comment.post_id) ?? "내 글";
              setNotifications(prev => [
                ...prev,
                {
                  id: `${comment.id}-${Date.now()}`,
                  postId: comment.post_id,
                  postTitle,
                  commenterName: comment.author_name,
                  commentContent: comment.content.slice(0, 60),
                },
              ]);
            }
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    let cleanup: (() => void) | undefined;
    init().then(fn => { cleanup = fn; });

    return () => { cleanup?.(); };
  }, []);

  return <NotificationToast notifications={notifications} onDismiss={dismiss} />;
}
