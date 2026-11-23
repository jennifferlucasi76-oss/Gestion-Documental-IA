"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  User,
  UserPlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "register";

function getSafeRedirectPath(rawNext: string | null): string {
  if (!rawNext || !rawNext.startsWith("/") || rawNext.startsWith("//")) {
    return "/";
  }
  return rawNext;
}

function mapSupabaseAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Credenciales incorrectas. Verifica tu correo institucional y contraseña.";
  }
  if (lower.includes("email not confirmed")) {
    return "Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada.";
  }
  if (lower.includes("user already registered")) {
    return "Ya existe una cuenta registrada con este correo electrónico.";
  }
  if (lower.includes("password should be at least")) {
    return "La contraseña debe tener al menos 6 caracteres.";
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
  const nextPath = getSafeRedirectPath(searchParams.get("next"));

  const [mode, setMode] = useState<AuthMode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!supabaseConfigured) {
      setErrorMsg(
        "Supabase aún no está configurado. Agrega NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local o en Vercel."
      );
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMsg("Completa tu correo electrónico y contraseña.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (error) {
          setErrorMsg(mapSupabaseAuthError(error.message));
          return;
        }

        if (data.user) {
          try {
            await supabase.from("audit_logs").insert({
              user_id: data.user.id,
              action: "LOGIN",
              details: { method: "password", email: data.user.email },
            });
          } catch {
            // No bloquear el acceso si la tabla audit_logs aún no ha sido creada.
          }
        }

        router.push(nextPath);
        router.refresh();
        return;
      }

      const trimmedName = fullName.trim();
      if (trimmedName.length < 3) {
        setErrorMsg("Ingresa tu nombre completo (mínimo 3 caracteres).");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: trimmedName,
          },
        },
      });

      if (error) {
        setErrorMsg(mapSupabaseAuthError(error.message));
        return;
      }

      if (data.session) {
        router.push(nextPath);
        router.refresh();
      } else {
        setSuccessMsg(
          "Registro completado. Revisa tu correo para confirmar la cuenta antes de iniciar sesión (rol inicial: Consulta)."
        );
        setMode("login");
        setPassword("");
      }
    } catch {
      setErrorMsg(
        "No se pudo conectar con el servicio de autenticación. Inténtalo de nuevo."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      {!supabaseConfigured && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-ue-gold-dark/30 bg-ue-gold-soft px-4 py-3 text-xs text-[#594300]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-ue-gold-dark" />
          <div>
            <p className="font-semibold">Entorno en espera de conexión Supabase</p>
            <p className="mt-0.5 leading-relaxed">
              Configura{" "}
              <code className="rounded bg-white/80 px-1 py-0.5 font-mono text-[11px]">
                NEXT_PUBLIC_SUPABASE_URL
              </code>{" "}
              y{" "}
              <code className="rounded bg-white/80 px-1 py-0.5 font-mono text-[11px]">
                NEXT_PUBLIC_SUPABASE_ANON_KEY
              </code>{" "}
              para habilitar el inicio de sesión real.
            </p>
          </div>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 rounded-xl border border-ue-border bg-ue-crimson-soft/60 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
            mode === "login"
              ? "bg-ue-crimson text-white shadow-sm"
              : "text-foreground/70 hover:text-ue-crimson"
          }`}
        >
          <LogIn className="h-4 w-4" />
          Iniciar sesión
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("register");
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
            mode === "register"
              ? "bg-ue-crimson text-white shadow-sm"
              : "text-foreground/70 hover:text-ue-crimson"
          }`}
        >
          <UserPlus className="h-4 w-4" />
          Crear cuenta
        </button>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-xl border border-ue-crimson/30 bg-ue-crimson-soft px-3.5 py-3 text-sm text-ue-crimson-dark"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-ue-crimson" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-600/25 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "register" && (
          <div>
            <label
              htmlFor="fullName"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground/75"
            >
              Nombre completo
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ue-gray" />
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Jenniffer Lucas Iñiga"
                className="w-full rounded-xl border border-ue-border bg-white py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition placeholder:text-ue-gray/70 focus:border-ue-crimson focus:ring-2 focus:ring-ue-crimson/15"
              />
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground/75"
          >
            Correo institucional
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ue-gray" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@uesanjose.edu.ec"
              className="w-full rounded-xl border border-ue-border bg-white py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition placeholder:text-ue-gray/70 focus:border-ue-crimson focus:ring-2 focus:ring-ue-crimson/15"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground/75"
          >
            Contraseña
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ue-gray" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-ue-border bg-white py-2.5 pl-10 pr-11 text-sm text-foreground outline-none transition placeholder:text-ue-gray/70 focus:border-ue-crimson focus:ring-2 focus:ring-ue-crimson/15"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={
                showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ue-gray transition hover:text-ue-crimson"
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
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-ue-crimson px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-ue-crimson-dark focus:outline-none focus:ring-2 focus:ring-ue-gold focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {mode === "login" ? "Validando acceso..." : "Creando cuenta..."}
            </>
          ) : mode === "login" ? (
            <>
              <ShieldCheck className="h-4 w-4 text-ue-gold" />
              Ingresar al sistema
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 text-ue-gold" />
              Registrar usuario
            </>
          )}
        </button>
      </form>

      <div className="mt-6 rounded-xl border border-ue-border bg-background p-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ue-crimson">
          Control de Acceso por Roles (RLS)
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-foreground/75">
          <div className="rounded-lg bg-white px-2.5 py-1.5 border border-ue-border/70">
            <span className="font-semibold text-foreground">Admin / Secretaría:</span>{" "}
            Acceso total e ingesta
          </div>
          <div className="rounded-lg bg-white px-2.5 py-1.5 border border-ue-border/70">
            <span className="font-semibold text-foreground">Docente / Consulta:</span>{" "}
            Interno y público
          </div>
        </div>
      </div>
    </div>
  );
}
