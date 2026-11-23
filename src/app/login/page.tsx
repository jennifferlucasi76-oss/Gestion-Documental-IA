import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BookOpenCheck, LockKeyhole, Sparkles } from "lucide-react";
import { LoginForm } from "@/components/LoginForm";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function LoginPage() {
  const supabaseConfigured = isSupabaseConfigured();

  return (
    <div className="relative flex min-h-screen flex-col justify-center bg-background px-4 py-8 sm:px-6 lg:px-8">
      {/* Franja superior institucional */}
      <div className="fixed inset-x-0 top-0 h-1.5 bg-gradient-to-r from-ue-crimson-deep via-ue-crimson to-ue-gold" />

      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ue-crimson transition hover:bg-ue-crimson-soft"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al panel del prototipo
          </Link>
          <span className="rounded-full border border-ue-crimson/20 bg-ue-crimson-soft px-3 py-1 text-xs font-medium text-ue-crimson">
            Itinerario: Seguridad • SGDI-IA
          </span>
        </div>

        <div className="grid overflow-hidden rounded-3xl border border-ue-border bg-white shadow-xl shadow-ue-crimson/5 lg:grid-cols-12">
          {/* Panel Institucional (Logo transparente sobre fondo luminoso + franja carmesí/oro) */}
          <div className="relative flex flex-col justify-between bg-gradient-to-b from-white via-[#FDF8F8] to-ue-crimson-soft p-8 lg:col-span-5 lg:border-r lg:border-ue-border">
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-ue-gold-dark/30 bg-ue-gold-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-ue-gold-dark">
                <Sparkles className="h-3 w-3" />
                Portal Institucional
              </div>

              <div className="relative my-2 flex items-center justify-center p-2">
                <Image
                  src="/logo-ue-sanjose.png"
                  alt="Escudo de la Unidad Educativa San José - Sociedad de Beneficencia de Señoras de Guayaquil"
                  width={210}
                  height={250}
                  priority
                  className="h-auto w-44 object-contain drop-shadow-sm sm:w-48"
                />
              </div>

              <h1 className="mt-2 text-xl font-bold tracking-tight text-ue-crimson-deep">
                Unidad Educativa San José
              </h1>
              <p className="mt-1 text-xs font-medium text-foreground/70">
                Sociedad de Beneficencia de Señoras de Guayaquil
              </p>
            </div>

            <div className="mt-8 rounded-2xl bg-ue-crimson p-5 text-white shadow-md shadow-ue-crimson/20">
              <div className="flex items-center gap-2 text-ue-gold">
                <BookOpenCheck className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Gestión Documental Inteligente
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-white/90">
                Acceso centralizado para clasificación automática de documentos,
                extracción de metadatos mediante PLN y búsqueda semántica segura.
              </p>
              <div className="mt-4 h-1 w-16 rounded-full bg-ue-gold" />
            </div>
          </div>

          {/* Panel de Autenticación */}
          <div className="flex flex-col justify-center p-7 sm:p-10 lg:col-span-7">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-lg bg-ue-crimson-soft px-2.5 py-1 text-xs font-semibold text-ue-crimson">
                <LockKeyhole className="h-3.5 w-3.5" />
                Acceso Seguro SGDI-IA
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                Control de Acceso al Sistema
              </h2>
              <p className="mt-1 text-sm text-foreground/65">
                Ingresa con tus credenciales institucionales para consultar,
                clasificar o administrar el repositorio documental.
              </p>
            </div>

            <Suspense
              fallback={
                <div className="h-64 animate-pulse rounded-2xl bg-ue-crimson-soft/50" />
              }
            >
              <LoginForm supabaseConfigured={supabaseConfigured} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
