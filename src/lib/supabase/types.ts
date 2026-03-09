export type PostType = "community" | "feature" | "bug" | "question";
export type Product = "oo.ai" | "o talk" | "platform";
export type SprintStatus = "draft" | "active" | "completed";
export type ItemStatus = "planned" | "in_progress" | "done";

export interface Post {
  id: string;
  title: string;
  content: string | null;
  author_id: string | null;
  author_name: string;
  author_avatar: string | null;
  tags: string[];
  post_type: PostType;
  product: Product | null;
  upvote_count: number;
  comment_count: number;
  sprint_id: string | null;
  locale: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vote {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string | null;
  author_name: string;
  author_avatar: string | null;
  content: string;
  created_at: string;
}

export interface Sprint {
  id: string;
  week_label: string;
  start_date: string;
  end_date: string;
  status: SprintStatus;
  ai_summary: string | null;
  total_posts_analyzed: number;
  total_votes_counted: number;
  created_at: string;
  confirmed_at: string | null;
}

export interface SprintItem {
  id: string;
  sprint_id: string;
  title: string;
  description: string | null;
  status: ItemStatus;
  product: Product | null;
  priority: number;
  source_post_ids: string[];
  community_score: number;
  created_at: string;
}

// Supabase Database type
export type Database = {
  public: {
    Tables: {
      posts: { Row: Post; Insert: Partial<Post>; Update: Partial<Post> };
      votes: { Row: Vote; Insert: Partial<Vote>; Update: Partial<Vote> };
      comments: { Row: Comment; Insert: Partial<Comment>; Update: Partial<Comment> };
      sprints: { Row: Sprint; Insert: Partial<Sprint>; Update: Partial<Sprint> };
      sprint_items: { Row: SprintItem; Insert: Partial<SprintItem>; Update: Partial<SprintItem> };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
