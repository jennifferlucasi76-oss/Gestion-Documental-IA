import Link from "next/link";
import { LogIn, ShieldCheck, UserCircle2 } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  secretaria: "Secretaría",
  docente: "Docente",
  consulta: "Consulta",
};

export async function HeaderSession() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex items-center gap-2.5">
        <span className="hidden rounded-full border border-ue-gold/40 bg-ue-gold/15 px-3 py-1 text-xs font-medium text-ue-gold sm:inline-flex">
          Vista previa (sin BD)
        </span>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 rounded-xl bg-ue-gold px-3.5 py-2 text-xs font-bold text-ue-crimson-deep shadow-sm transition hover:bg-[#ffe033]"
        >
          <LogIn className="h-3.5 w-3.5" />
          Ir al Login
        </Link>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 rounded-xl bg-ue-gold px-3.5 py-2 text-xs font-bold text-ue-crimson-deep shadow-sm transition hover:bg-[#ffe033]"
      >
        <LogIn className="h-3.5 w-3.5" />
        Iniciar sesión
      </Link>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, department")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    profile?.full_name || user.email?.split("@")[0] || "Usuario";
  const roleLabel = ROLE_LABELS[profile?.role ?? "consulta"] ?? "Consulta";

  return (
    <div className="flex items-center gap-3">
      <div className="hidden items-center gap-2.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-right sm:flex">
        <UserCircle2 className="h-5 w-5 text-ue-gold" />
        <div className="leading-tight">
          <p className="text-xs font-semibold text-white">{displayName}</p>
          <p className="flex items-center gap-1 text-[11px] text-white/80">
            <ShieldCheck className="h-3 w-3 text-ue-gold" />
            {roleLabel}
            {profile?.department ? ` • ${profile.department}` : ""}
          </p>
        </div>
      </div>
      <LogoutButton />
    </div>
  );
}
