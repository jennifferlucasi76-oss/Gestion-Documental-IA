"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getRoleHomePath,
  identificationToAuthEmail,
  isValidRole,
} from "@/lib/roles";

function getSafeRedirectPath(rawNext: string | null): string | null {
  if (!rawNext || !rawNext.startsWith("/") || rawNext.startsWith("//")) {
    return null;
  }
  if (rawNext === "/" || rawNext === "/login") {
    return null;
  }
  return rawNext;
}

function mapSupabaseAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Credenciales incorrectas. Verifica tu número de identificación y contraseña.";
  }
  if (lower.includes("email not confirmed")) {
    return "Tu cuenta aún no ha sido activada.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Demasiados intentos seguidos. Espera un momento e intenta nuevamente.";
  }
  return message;
}

export function LoginForm({
  supabaseConfigured,
}: {
  supabaseConfigured: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNext = getSafeRedirectPath(searchParams.get("next"));

  const [identification, setIdentification] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    if (!supabaseConfigured) {
      setErrorMsg("El servicio de autenticación no está configurado.");
      return;
    }

    const cleanId = identification.trim();
    if (!cleanId || !password) {
      setErrorMsg("Ingresa tu número de identificación y contraseña.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const authEmail = identificationToAuthEmail(cleanId);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (error) {
        setErrorMsg(mapSupabaseAuthError(error.message));
        return;
      }

      let destination = requestedNext ?? "/";

      if (data.user) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .maybeSingle();

          if (profile && isValidRole(profile.role)) {
            destination = requestedNext ?? getRoleHomePath(profile.role);
          }

          await supabase.from("audit_logs").insert({
            user_id: data.user.id,
            action: "LOGIN",
            details: { method: "identification", identification: cleanId },
          });
        } catch {
          // No bloquear el acceso si falla el registro en bitácora.
        }
      }

      router.push(destination);
      router.refresh();
    } catch {
      setErrorMsg("No se pudo conectar con el servidor. Inténtalo nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      {errorMsg && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-xl border border-ue-crimson/25 bg-ue-crimson-soft px-3.5 py-2.5 text-xs font-medium text-ue-crimson-dark"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-ue-crimson" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="identification"
            className="mb-1.5 block text-xs font-semibold text-foreground/85"
          >
            Número de identificación
          </label>
          <input
            id="identification"
            name="identification"
            type="text"
            inputMode="numeric"
            autoComplete="username"
            required
            value={identification}
            onChange={(e) => setIdentification(e.target.value)}
            placeholder="0951374305"
            className="w-full rounded-xl border border-[#DCE3EE] bg-[#F2F6FC] px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-ue-gray/75 focus:border-ue-crimson focus:bg-white focus:ring-2 focus:ring-ue-crimson/15"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-xs font-semibold text-foreground/85"
          >
            Contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-[#DCE3EE] bg-[#F2F6FC] py-3 pl-4 pr-11 text-sm text-foreground outline-none transition placeholder:text-ue-gray/75 focus:border-ue-crimson focus:bg-white focus:ring-2 focus:ring-ue-crimson/15"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={
                showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-foreground/55 transition hover:text-ue-crimson"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-ue-crimson to-[#B81422] px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-ue-crimson/25 transition hover:from-ue-crimson-dark hover:to-ue-crimson focus:outline-none focus:ring-2 focus:ring-ue-gold focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              Entrar
            </>
          )}
        </button>
      </form>
    </div>
  );
}
