import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FileText,
  KeyRound,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { HeaderSession } from "@/components/HeaderSession";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const modules = [
  {
    title: "1. Ingesta y Preprocesamiento",
    description:
      "Carga segura de archivos .pdf y .docx, limpieza de texto, división en fragmentos y cálculo de hash SHA-256.",
    icon: FileText,
    status: "Base lista (parser + SHA-256)",
    badgeColor: "bg-ue-gold-soft text-ue-gold-dark border-ue-gold-dark/20",
  },
  {
    title: "2. Clasificación Supervisada + PLN",
    description:
      "Categorización automática por tipo documental y extracción de metadatos clave (fecha, autor, dependencia, temática y entidades).",
    icon: Sparkles,
    status: "Pendiente: dataset y modelo",
    badgeColor: "bg-ue-crimson-soft text-ue-crimson border-ue-crimson/20",
  },
  {
    title: "3. Búsqueda Semántica Vectorial",
    description:
      "Recuperación por lenguaje natural con embeddings en Supabase pgvector y ranking por relevancia.",
    icon: Search,
    status: "SQL listo (match_documents)",
    badgeColor: "bg-ue-gold-soft text-ue-gold-dark border-ue-gold-dark/20",
  },
  {
    title: "4. Seguridad, RLS y Auditoría",
    description:
      "Autenticación por roles, niveles de acceso (Público, Interno, Confidencial), bucket privado, bitácora y verificación SHA-256.",
    icon: ShieldCheck,
    status: "Login y políticas RLS integrados",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-600/20",
  },
];

const accessRoles = [
  {
    role: "Administrador",
    scope: "Público • Interno • Confidencial",
    detail: "Gestión de usuarios, tipos documentales, ingesta y auditoría total.",
  },
  {
    role: "Secretaría",
    scope: "Público • Interno • Confidencial",
    detail: "Carga, clasificación asistida por IA y administración documental.",
  },
  {
    role: "Docente",
    scope: "Público • Interno",
    detail: "Búsqueda semántica y consulta de circulares, oficios y memorandos.",
  },
  {
    role: "Consulta",
    scope: "Público",
    detail: "Acceso restringido únicamente a documentos institucionales públicos.",
  },
];

export default function Home() {
  const supabaseReady = isSupabaseConfigured();
  const geminiReady = Boolean(process.env.GEMINI_API_KEY);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header Institucional */}
      <header className="sticky top-0 z-20 border-b border-ue-crimson-deep bg-ue-crimson text-white shadow-md shadow-ue-crimson/15">
        <div className="h-1 w-full bg-ue-gold" />
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-sm ring-2 ring-ue-gold/70">
              <Image
                src="/logo-ue-sanjose.png"
                alt="Logo Unidad Educativa San José"
                width={44}
                height={52}
                priority
                className="h-10 w-auto object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight sm:text-lg">
                  SGDI-IA
                </h1>
                <span className="hidden rounded-md bg-ue-gold/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ue-gold sm:inline-block">
                  San José • Guayaquil
                </span>
              </div>
              <p className="text-xs text-white/85">
                Gestión Documental Inteligente — Unidad Educativa San José
              </p>
            </div>
          </div>

          <Suspense
            fallback={
              <div className="h-8 w-28 animate-pulse rounded-xl bg-white/15" />
            }
          >
            <HeaderSession />
          </Suspense>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-7 px-4 py-8 sm:px-6">
        {/* Banner principal acorde al logo */}
        <section className="relative overflow-hidden rounded-3xl border border-ue-border bg-white p-6 shadow-sm sm:p-8">
          <div className="absolute right-0 top-0 h-full w-1.5 bg-gradient-to-b from-ue-crimson via-ue-gold to-ue-crimson" />
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ue-crimson/20 bg-ue-crimson-soft px-3 py-1 text-xs font-semibold text-ue-crimson">
                <Lock className="h-3.5 w-3.5" />
                Itinerario: Seguridad • Prototipo de Tesis
              </span>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Repositorio Documental Inteligente
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                Plataforma centralizada para la{" "}
                <strong className="text-ue-crimson">
                  Unidad Educativa San José
                </strong>{" "}
                orientada a la clasificación automática, extracción de metadatos
                mediante PLN y búsqueda semántica con control de acceso por roles.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-ue-border bg-background px-3.5 py-2 text-xs">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      supabaseReady ? "bg-emerald-500" : "bg-ue-gold-dark"
                    }`}
                  />
                  <span>
                    Supabase:{" "}
                    <strong className="text-foreground">
                      {supabaseReady ? "Conectado" : "Pendiente (.env.local)"}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-ue-border bg-background px-3.5 py-2 text-xs">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      geminiReady ? "bg-emerald-500" : "bg-ue-gold-dark"
                    }`}
                  />
                  <span>
                    Gemini API:{" "}
                    <strong className="text-foreground">
                      {geminiReady ? "Configurado" : "Pendiente (.env.local)"}
                    </strong>
                  </span>
                </div>

                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-ue-crimson px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-ue-crimson-dark"
                >
                  <KeyRound className="h-3.5 w-3.5 text-ue-gold" />
                  Pantalla de Acceso (Login)
                </Link>
              </div>
            </div>

            <div className="hidden shrink-0 items-center justify-center rounded-2xl border border-ue-border bg-ue-crimson-soft/40 p-4 lg:flex">
              <Image
                src="/logo-ue-sanjose.png"
                alt="Escudo Unidad Educativa San José"
                width={132}
                height={157}
                className="h-36 w-auto object-contain"
              />
            </div>
          </div>
        </section>

        {/* Módulos del prototipo */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ue-crimson">
              Módulos del Sistema
            </h3>
            <span className="text-xs text-ue-gray">
              Arquitectura Next.js + Supabase pgvector
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <div
                  key={mod.title}
                  className="flex flex-col justify-between rounded-2xl border border-ue-border bg-white p-6 shadow-sm transition hover:border-ue-crimson/35 hover:shadow-md hover:shadow-ue-crimson/5"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ue-crimson text-ue-gold shadow-sm">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h4 className="font-semibold text-foreground">
                        {mod.title}
                      </h4>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-foreground/70">
                      {mod.description}
                    </p>
                  </div>
                  <div className="mt-4">
                    <span
                      className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${mod.badgeColor}`}
                    >
                      {mod.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Niveles de acceso y seguridad */}
        <section className="rounded-2xl border border-ue-border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ue-crimson-soft text-ue-crimson">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Matriz de Accesos por Rol (RLS)
              </h3>
              <p className="text-xs text-foreground/65">
                Niveles de autorización definidos en la base de datos para
                resguardar la confidencialidad documental.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {accessRoles.map((item) => (
              <div
                key={item.role}
                className="rounded-xl border border-ue-border bg-background p-4"
              >
                <p className="text-sm font-bold text-ue-crimson">{item.role}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-ue-gold-dark">
                  {item.scope}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-foreground/70">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-ue-border bg-white py-4 text-center text-xs text-ue-gray">
        SGDI-IA • Unidad Educativa San José (Guayaquil) — Proyecto de
        Integración Curricular
      </footer>
    </div>
  );
}
