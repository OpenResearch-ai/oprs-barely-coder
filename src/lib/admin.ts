// NEXT_PUBLIC_ prefix required so client components can read it
// The email being visible in public code is acceptable (not a secret)
const raw =
  process.env.NEXT_PUBLIC_ADMIN_EMAILS ??
  process.env.ADMIN_EMAILS ??
  "";

const ADMIN_EMAILS = raw
  .split(",")
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdmin(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

export function getAuthorName(user: {
  email?: string | null;
  user_metadata?: { name?: string; user_name?: string };
}): string {
  if (isAdmin(user.email)) return "OpenResearch";
  return (
    user.user_metadata?.name ??
    user.user_metadata?.user_name ??
    user.email?.split("@")[0] ??
    "anonymous"
  );
}
