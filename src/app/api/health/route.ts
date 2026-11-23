import { NextResponse } from "next/server";

export async function GET() {
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasSupabaseAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);

  return NextResponse.json({
    status: "ok",
    service: "SGDI-IA Prototipo",
    env: {
      supabaseConfigured: hasSupabaseUrl && hasSupabaseAnon,
      geminiConfigured: hasGeminiKey,
    },
    timestamp: new Date().toISOString(),
  });
}

