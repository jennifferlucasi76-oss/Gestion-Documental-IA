"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  ShieldCheck,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { evaluatePassword } from "@/lib/password-policy";

export function ChangePasswordForm({
  identification,
}: {
  identification: string;
}) {
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const evaluation = evaluatePassword(newPassword);
  const isSameAsId =
    newPassword.trim().length > 0 &&
    newPassword.trim() === identification.trim();
  const hasConfirmInput = confirmPassword.length > 0;
  const passwordsMatch =
    hasConfirmInput && newPassword === confirmPassword;

  const canSubmit =
    evaluation.isValid && passwordsMatch && !isSameAsId && !saving;

  const barConfig = {
    empty: {
      width: "0%",
      barClass: "bg-transparent",
      textClass: "text-ue-gray",
    },
    weak: {
      width: "33%",
      barClass: "bg-red-600",
      textClass: "text-red-600",
    },
    medium: {
      width: "66%",
      barClass: "bg-amber-400",
      textClass: "text-amber-600",
    },
    strong: {
      width: "100%",
      barClass: "bg-blue-600",
      textClass: "text-blue-600",
    },
  }[evaluation.level];

  const rules = [
    { label: "Mínimo 8 caracteres", met: evaluation.checks.minLength },
    { label: "Al menos una mayúscula (A-Z)", met: evaluation.checks.hasUppercase },
    { label: "Al menos una minúscula (a-z)", met: evaluation.checks.hasLowercase },
    { label: "Al menos un número (0-9)", met: evaluation.checks.hasNumber },
    { label: "Al menos un símbolo (!@#$%...)", met: evaluation.checks.hasSymbol },
  ];

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    if (isSameAsId) {
      setErrorMsg("La nueva contraseña no puede ser igual a tu número de cédula.");
      return;
    }

    if (!evaluation.isValid) {
      setErrorMsg("La contraseña debe cumplir todas las reglas de seguridad.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Las contraseñas no coinciden.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword, confirmPassword }),
      });

      const payload = (await res.json()) as {
        ok?: boolean;
        redirectTo?: string;
        error?: string;
      };

      if (!res.ok || !payload.ok) {
        setErrorMsg(payload.error || "No se pudo actualizar la contraseña.");
        return;
      }

      router.push(payload.redirectTo || "/");
      router.refresh();
    } catch {
      setErrorMsg("Error de conexión al guardar la nueva contraseña.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="w-full">
      {errorMsg && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-ue-crimson/25 bg-ue-crimson-soft px-3 py-2.5 text-xs font-medium text-ue-crimson-dark"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-ue-crimson" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="new-password"
            className="mb-1.5 block text-xs font-semibold text-foreground/85"
          >
            Nueva contraseña
          </label>
          <div className="relative">
            <input
              id="new-password"
              name="newPassword"
              type={showNew ? "text" : "password"}
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Ingresa tu nueva contraseña"
              className="w-full rounded-lg border border-[#D4DCE8] bg-[#EEF3FA] py-2.5 pl-3.5 pr-10 text-sm text-foreground outline-none transition placeholder:text-ue-gray focus:border-ue-crimson focus:bg-white focus:ring-2 focus:ring-ue-crimson/15"
            />
            <button
              type="button"
              onClick={() => setShowNew((prev) => !prev)}
              aria-label={showNew ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-foreground/60 transition hover:text-ue-crimson"
            >
              {showNew ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Barra de seguridad en tiempo real */}
          <div className="mt-2.5">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-foreground/65">
                Nivel de seguridad
              </span>
              <span className={`font-bold ${barConfig.textClass}`}>
                {evaluation.label || "Sin evaluar"}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-300 ${barConfig.barClass}`}
                style={{ width: barConfig.width }}
              />
            </div>

            {isSameAsId && (
              <p className="mt-1.5 text-xs font-medium text-red-600">
                La nueva contraseña debe ser diferente a tu número de cédula.
              </p>
            )}

            <ul className="mt-3 grid grid-cols-1 gap-1.5 rounded-xl border border-ue-border/80 bg-background p-3 text-xs sm:grid-cols-2">
              {rules.map((rule) => (
                <li
                  key={rule.label}
                  className={`flex items-center gap-1.5 ${
                    rule.met
                      ? "font-semibold text-blue-700"
                      : "text-foreground/60"
                  }`}
                >
                  {rule.met ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                  ) : (
                    <X className="h-3.5 w-3.5 shrink-0 text-ue-gray/70" />
                  )}
                  <span>{rule.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="mb-1.5 block text-xs font-semibold text-foreground/85"
          >
            Comprobar nueva contraseña
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite tu nueva contraseña"
              className="w-full rounded-lg border border-[#D4DCE8] bg-[#EEF3FA] py-2.5 pl-3.5 pr-10 text-sm text-foreground outline-none transition placeholder:text-ue-gray focus:border-ue-crimson focus:bg-white focus:ring-2 focus:ring-ue-crimson/15"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((prev) => !prev)}
              aria-label={
                showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"
              }
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-foreground/60 transition hover:text-ue-crimson"
            >
              {showConfirm ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {hasConfirmInput && (
            <p
              className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${
                passwordsMatch ? "text-blue-600" : "text-red-600"
              }`}
            >
              {passwordsMatch ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Las contraseñas coinciden.
                </>
              ) : (
                <>
                  <X className="h-3.5 w-3.5" />
                  Las contraseñas no coinciden.
                </>
              )}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-ue-crimson px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ue-crimson-dark focus:outline-none focus:ring-2 focus:ring-ue-gold focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Actualizando contraseña...
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4 text-ue-gold" />
              Guardar nueva contraseña
            </>
          )}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ue-gray transition hover:text-ue-crimson"
        >
          <LogOut className="h-3.5 w-3.5" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
