// Server-safe tool declarations for Gemini function calling
// (no "use client" — used in API route)

export const TOOL_DECLARATIONS = [
  {
    name: "navigate_page",
    description: "Navigate to a specific page on openresearch.ai.",
    parameters: {
      type: "OBJECT",
      properties: {
        page: {
          type: "STRING",
          enum: ["community", "products", "about", "profile"],
          description: "Target page name",
        },
      },
      required: ["page"],
    },
  },
  {
    name: "filter_community",
    description: "Filter community posts by category.",
    parameters: {
      type: "OBJECT",
      properties: {
        filter: {
          type: "STRING",
          enum: ["all", "vibe_coding", "ai", "showcase", "resource", "question", "proposal", "oo.ai", "o_talk", "platform"],
        },
      },
      required: ["filter"],
    },
  },
  {
    name: "search_community",
    description: "Search community posts by keyword.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING" },
      },
      required: ["query"],
    },
  },
  {
    name: "highlight_posts",
    description: "Visually highlight specific community posts or page sections.",
    parameters: {
      type: "OBJECT",
      properties: {
        post_ids: { type: "ARRAY", items: { type: "STRING" } },
        sections: { type: "ARRAY", items: { type: "STRING" } },
      },
    },
  },
  {
    name: "open_write_modal",
    description: "Open the community post creation form, optionally pre-filled with AI-generated content.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        content: { type: "STRING" },
        category: {
          type: "STRING",
          enum: ["community", "showcase", "resource", "question", "proposal", "feature", "bug"],
        },
      },
    },
  },
  {
    name: "clear_filters",
    description: "Clear all active community filters and search queries.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "ban_user",
    description: "Ban a user for 24 hours (admin only). Use when a user is reported for serious violations.",
    parameters: {
      type: "OBJECT",
      properties: {
        user_id: { type: "STRING", description: "The user's ID to ban" },
        reason: { type: "STRING", description: "Reason for the ban" },
      },
      required: ["user_id", "reason"],
    },
  },
];
