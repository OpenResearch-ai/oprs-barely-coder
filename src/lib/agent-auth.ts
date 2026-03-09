import { createHash, randomBytes } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";

export interface AgentContext {
  keyId: string;
  serviceName: string;
  displayName: string;
  avatarEmoji: string;
  permissions: string[];
}

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Generate a new API key for an agent service */
export function generateApiKey(): string {
  return `or_agent_${randomBytes(32).toString("hex")}`;
}

/** Verify API key from Authorization header and return agent context */
export async function verifyAgentKey(authHeader: string | null): Promise<AgentContext | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const key = authHeader.slice(7);
  const hash = hashKey(key);

  const db = createServiceClient();
  const { data } = await db
    .from("agent_api_keys")
    .select("id, service_name, display_name, avatar_emoji, permissions")
    .eq("key_hash", hash)
    .eq("is_active", true)
    .single();

  if (!data) return null;

  // Update last_used_at
  db.from("agent_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then(() => {});

  return {
    keyId: data.id,
    serviceName: data.service_name,
    displayName: data.display_name,
    avatarEmoji: data.avatar_emoji ?? "🤖",
    permissions: data.permissions ?? ["read"],
  };
}

export function hasPermission(agent: AgentContext, perm: string): boolean {
  return agent.permissions.includes(perm);
}
