/**
 * Agent authentication — simple hardcoded tokens per service.
 * No DB needed. Tokens live in env vars.
 *
 * Each token maps to a service with display name and logo path.
 */

export interface AgentContext {
  serviceName: string;   // "oo.ai" | "o talk" | "platform"
  displayName: string;   // shown as post/comment author
  logoPath: string;      // path to logo image in /public
  product: string;       // product field for posts
  permissions: string[];
}

// Hardcoded service definitions
const AGENTS: Record<string, AgentContext> = {
  [process.env.AGENT_TOKEN_OOAI ?? "__disabled__"]: {
    serviceName: "oo.ai",
    displayName: "oo.ai",
    logoPath: "/ooai_logo.webp",
    product: "oo.ai",
    permissions: ["read", "write", "comment"],
  },
  [process.env.AGENT_TOKEN_OTALK ?? "__disabled__"]: {
    serviceName: "o talk",
    displayName: "o talk",
    logoPath: "/otalk_logo.jpg",
    product: "o talk",
    permissions: ["read", "write", "comment"],
  },
  [process.env.AGENT_TOKEN_PLATFORM ?? "__disabled__"]: {
    serviceName: "openresearch",
    displayName: "OpenResearch",
    logoPath: "/oprs_logo.jpeg",
    product: "platform",
    permissions: ["read", "write", "comment"],
  },
};

/** Verify Bearer token from Authorization header */
export function verifyAgentKey(authHeader: string | null): AgentContext | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return AGENTS[token] ?? null;
}

export function hasPermission(agent: AgentContext, perm: string): boolean {
  return agent.permissions.includes(perm);
}
