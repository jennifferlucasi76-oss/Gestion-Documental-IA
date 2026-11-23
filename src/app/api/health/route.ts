import { NextResponse } from "next/server";
import { isAiConfigured } from "@/lib/ai";

export async function GET() {
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasSupabaseAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasOpenAiKey = isAiConfigured();

  return NextResponse.json({
    status: "ok",
    service: "SGDI-IA Prototipo",
    env: {
      supabaseConfigured: hasSupabaseUrl && hasSupabaseAnon,
      aiConfigured: hasOpenAiKey,
      aiProvider: hasOpenAiKey ? "openai" : null,
    },
    timestamp: new Date().toISOString(),
  });
}
