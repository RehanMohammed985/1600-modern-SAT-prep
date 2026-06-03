import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/env";

export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ history: [] });

    const { data: profiles } = await supabase
      .from("profiles")
      .select("created_at")
      .eq("id", user.id)
      .maybeSingle();

    if (!profiles) return NextResponse.json({ history: [] });

    const { data: scoreHistory } = await supabase
      .from("score_predictions")
      .select("*")
      .eq("student_id", user.id)
      .order("created_at", { ascending: true })
      .limit(50);

    const history = (scoreHistory ?? []).map((row: Record<string, unknown>) => ({
      date: String(row.created_at ?? new Date().toISOString()),
      predicted: Number(row.predicted_total ?? 800),
      math: Number(row.predicted_math ?? 400),
      readingWriting: Number(row.predicted_rw ?? 400),
    }));

    return NextResponse.json({ history });
  } catch (error) {
    console.error("GET /api/intelligence/history", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
