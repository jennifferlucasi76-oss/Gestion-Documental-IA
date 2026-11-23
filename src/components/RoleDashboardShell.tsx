import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Brain,
  ClipboardCheck,
  Clock,
  FileCheck2,
  FilePlus2,
  HeartHandshake,
  LayoutDashboard,
  Layers,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  UserCircle2,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import {
  ROLE_CONFIG,
  type RoleModuleCard,
  type UserRole,
} from "@/lib/roles";
import type { AuthenticatedProfile } from "@/lib/auth";

const ICON_MAP: Record<RoleModuleCard["iconName"], LucideIcon> = {
  "bar-chart": BarChart3,
  "shield-check": ShieldCheck,
  "file-check": FileCheck2,
  upload: Upload,
  sparkles: Sparkles,
  search: Search,
  "file-plus": FilePlus2,
  "book-open": BookOpen,
  "heart-handshake": HeartHandshake,
  "clipboard-check": ClipboardCheck,
  layers: Layers,
  brain: Brain,
};

export function RoleDashboardShell({
  roleKey,
  profile,
  activeNav = "home",
  pageTitle,
  children,
}: {
  roleKey: UserRole;
  profile: AuthenticatedProfile;
  activeNav?: "home" | "usuarios";
  pageTitle?: string;
  children?: ReactNode;
}) {
  const config = ROLE_CONFIG[roleKey];

  return (
    <div className="min-h-screen flex flex-col bg-background lg:flex-row">
      {/* Barra lateral institucional */}
      <aside className="flex w-full shrink-0 flex-col border-b border-ue-border bg-white lg:w-72 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 border-b border-ue-border px-5 py-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ue-crimson-soft/60 p-1 ring-1 ring-ue-border">
            <Image
              src="/logo-ue-sanjose.png"
              alt="Unidad Educativa San José"
              width={42}
              height={50}
              priority
              className="h-10 w-auto object-contain"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-ue-crimson-deep">
              Unidad Educativa San José
            </p>
            <p className="truncate text-xs text-foreground/60">
              Sistema Documental • SGDI-IA
            </p>
          </div>
        </div>

        {/* Navegación principal del rol */}
        <nav className="flex-1 space-y-6 p-4">
          <div>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-ue-gray">
              Menú principal
            </p>
            <ul className="mt-2 space-y-1">
              <li>
                <Link
                  href={config.path}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    activeNav === "home"
                      ? "bg-ue-crimson text-white shadow-sm shadow-ue-crimson/20"
                      : "text-foreground/75 hover:bg-ue-crimson-soft/70 hover:text-ue-crimson"
                  }`}
                >
                  <LayoutDashboard
                    className={`h-4 w-4 ${
                      activeNav === "home" ? "text-ue-gold" : "text-ue-crimson/70"
                    }`}
                  />
                  Panel principal
                </Link>
              </li>

              {roleKey === "rector" && (
                <li>
                  <Link
                    href="/panel/rector/usuarios"
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                      activeNav === "usuarios"
                        ? "bg-ue-crimson text-white shadow-sm shadow-ue-crimson/20"
                        : "text-foreground/75 hover:bg-ue-crimson-soft/70 hover:text-ue-crimson"
                    }`}
                  >
                    <UserPlus
                      className={`h-4 w-4 ${
                        activeNav === "usuarios"
                          ? "text-ue-gold"
                          : "text-ue-crimson/70"
                      }`}
                    />
                    Registro de Usuarios
                  </Link>
                </li>
              )}

              {config.modules.map((mod) => {
                const Icon = ICON_MAP[mod.iconName];
                return (
                  <li key={mod.id}>
                    <div className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm text-foreground/70">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0 text-ue-crimson/70" />
                        <span className="truncate">{mod.title}</span>
                      </span>
                      <span className="shrink-0 rounded-md bg-ue-crimson-soft px-1.5 py-0.5 text-[10px] font-medium text-ue-crimson">
                        Pronto
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Tarjeta de usuario en el pie de la barra lateral */}
        <div className="border-t border-ue-border bg-ue-crimson-soft/35 p-4">
          <div className="flex items-center gap-2.5">
            <UserCircle2 className="h-8 w-8 shrink-0 text-ue-crimson" />
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-foreground">
                {profile.fullName}
              </p>
              <p className="truncate text-[11px] text-foreground/65">
                C.I. {profile.identification} • {profile.department}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Encabezado superior carmesí + línea dorada */}
        <header className="sticky top-0 z-10 border-b border-ue-crimson-deep bg-ue-crimson text-white shadow-sm">
          <div className="h-1 w-full bg-ue-gold" />
          <div className="flex items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-ue-gold px-2.5 py-0.5 text-[11px] font-bold text-ue-crimson-deep">
                  {config.badge}
                </span>
              </div>
              <h1 className="mt-1 truncate text-lg font-bold tracking-tight sm:text-xl">
                {pageTitle ?? config.title}
              </h1>
            </div>

            <LogoutButton />
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-5 sm:p-8">
          {children ? (
            children
          ) : (
            <>
              {/* Banner de bienvenida del rol */}
              <section className="relative overflow-hidden rounded-3xl border border-ue-border bg-white p-6 shadow-sm sm:p-7">
                <div className="absolute inset-y-0 right-0 w-1.5 bg-gradient-to-b from-ue-gold via-ue-crimson to-ue-crimson-deep" />
                <p className="text-xs font-semibold uppercase tracking-wider text-ue-crimson">
                  Rol Principal
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {config.principalRole}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-foreground/70">
                  {config.welcomeSubtitle}
                </p>
              </section>

              {/* Indicadores principales (estructura base) */}
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {config.metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-2xl border border-ue-border bg-white p-5 shadow-sm"
                  >
                    <p className="text-xs font-semibold text-foreground/65">
                      {metric.label}
                    </p>
                    <p className="mt-2 text-2xl font-extrabold tracking-tight text-ue-crimson">
                      {metric.value}
                    </p>
                    <p className="mt-1 text-xs text-ue-gray">{metric.hint}</p>
                  </div>
                ))}
              </section>

              {/* Funciones asignadas al rol */}
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-ue-crimson">
                    Funciones en el Sistema
                  </h3>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-ue-gold-soft px-3 py-1 text-xs font-semibold text-[#7A5900]">
                    <Clock className="h-3.5 w-3.5" />
                    Módulos listos para implementación
                  </span>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  {config.modules.map((mod, index) => {
                    const Icon = ICON_MAP[mod.iconName];
                    return (
                      <article
                        key={mod.id}
                        className="flex flex-col justify-between rounded-2xl border border-ue-border bg-white p-6 shadow-sm transition hover:border-ue-crimson/40 hover:shadow-md hover:shadow-ue-crimson/5"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ue-crimson text-ue-gold shadow-sm">
                              <Icon className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-bold text-ue-gray/70">
                              0{index + 1}
                            </span>
                          </div>

                          <h4 className="mt-4 text-base font-bold text-foreground">
                            {mod.title}
                          </h4>
                          <p className="mt-0.5 text-xs font-semibold text-ue-crimson">
                            {mod.subtitle}
                          </p>
                          <p className="mt-3 text-sm leading-relaxed text-foreground/70">
                            {mod.description}
                          </p>
                        </div>

                        <div className="mt-5 border-t border-ue-border/70 pt-4">
                          <button
                            type="button"
                            disabled
                            className="w-full cursor-not-allowed rounded-xl border border-ue-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground/50"
                          >
                            Módulo en construcción
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
