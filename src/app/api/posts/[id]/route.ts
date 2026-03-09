import { NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return Response.json({ error: "Login required" }, { status: 401 });

  const db = createServiceClient();

  // Admin can delete any post; others only their own
  const query = isAdmin(user.email)
    ? db.from("posts").delete().eq("id", id)
    : db.from("posts").delete().eq("id", id).eq("author_id", user.id);

  const { error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true });
}
