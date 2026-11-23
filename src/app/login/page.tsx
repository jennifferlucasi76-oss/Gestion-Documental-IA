import { Suspense } from "react";
import Image from "next/image";
import { LogIn } from "lucide-react";
import { LoginForm } from "@/components/LoginForm";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function LoginPage() {
  const supabaseConfigured = isSupabaseConfigured();

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6"
      style={{
        background:
          "radial-gradient(circle at 12% 10%, rgba(248, 208, 0, 0.22) 0%, rgba(251, 249, 249, 0) 42%), radial-gradient(circle at 88% 12%, rgba(152, 16, 24, 0.14) 0%, rgba(251, 249, 249, 0) 45%), #FBF9F9",
      }}
    >
      <div className="grid w-full max-w-[880px] overflow-hidden rounded-3xl bg-white shadow-[0_24px_65px_-20px_rgba(94,9,14,0.22)] ring-1 ring-ue-border/80 md:grid-cols-12">
        {/* Panel izquierdo: gradiente dorado-carmesí acorde al logo */}
        <div
          className="relative flex flex-col justify-center overflow-hidden p-8 text-white sm:p-10 md:col-span-5"
          style={{
            background:
              "radial-gradient(circle at 18% 16%, #F8D000 0%, #D9531E 28%, #981018 68%, #680A10 100%)",
          }}
        >
          {/* Detalle geométrico sutil */}
          <div className="pointer-events-none absolute -bottom-16 -right-12 h-56 w-56 rounded-full bg-white/10 blur-2xl" />

          <div className="relative z-10 flex flex-col items-start">
            {/* Logo transparente sobre aura luminosa para máxima legibilidad */}
            <div className="relative mb-6 flex h-32 w-32 items-center justify-center rounded-2xl bg-white/95 p-2.5 shadow-[0_0_40px_rgba(255,255,255,0.75)] ring-4 ring-white/40">
              <Image
                src="/logo-ue-sanjose.png"
                alt="Unidad Educativa San José"
                width={112}
                height={132}
                priority
                className="h-full w-auto object-contain"
              />
            </div>

            <h1 className="text-3xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-[34px]">
              Panel
              <br />
              institucional
            </h1>
            <p className="mt-3 text-xs font-medium leading-relaxed text-white/90 sm:text-sm">
              Unidad Educativa San José • Guayaquil.
            </p>
          </div>
        </div>

        {/* Panel derecho: formulario minimalista */}
        <div className="flex flex-col justify-center bg-white p-8 sm:p-12 md:col-span-7">
          <div className="mb-7">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ue-gold-soft px-3 py-1 text-xs font-semibold text-[#7A5900]">
              <LogIn className="h-3.5 w-3.5" />
              Acceso autorizado
            </span>

            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground">
              Iniciar sesión
            </h2>
            <p className="mt-1.5 text-sm text-foreground/60">
              Acceso privado al sistema documental.
            </p>
          </div>

          <Suspense
            fallback={
              <div className="h-52 animate-pulse rounded-2xl bg-ue-crimson-soft/40" />
            }
          >
            <LoginForm supabaseConfigured={supabaseConfigured} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
