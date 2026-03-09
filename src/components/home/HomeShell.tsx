"use client";

import { useState } from "react";
import CommunityFeed from "./CommunityFeed";
import ChatBot from "@/components/chatbot/ChatBot";

interface PagePost {
  id: string;
  title: string;
  type: string;
  product?: string;
}

export default function HomeShell() {
  const [pagePosts, setPagePosts] = useState<PagePost[]>([]);

  return (
    <>
      <CommunityFeed onPostsLoaded={setPagePosts} />
      <ChatBot pageContext={{ posts: pagePosts }} />
    </>
  );
}
