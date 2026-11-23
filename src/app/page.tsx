import { FileText, Search, ShieldCheck, Sparkles, Database } from "lucide-react";

const modules = [
  {
    title: "1. Ingesta y Preprocesamiento",
    description:
      "Carga segura de archivos .pdf y .docx, limpieza de texto y cálculo de hash SHA-256.",
    icon: FileText,
    status: "Base lista (parser + SHA-256)",
  },
  {
    title: "2. Clasificación Supervisada + PLN",
    description:
      "Categorización automática por tipo documental y extracción de metadatos clave (fecha, autor, dependencia, entidades).",
    icon: Sparkles,
    status: "Pendiente: dataset y modelo",
  },
  {
    title: "3. Búsqueda Semántica Vectorial",
    description:
      "Recuperación por lenguaje natural con embeddings en Supabase pgvector y ranking por relevancia.",
    icon: Search,
    status: "SQL listo (match_documents)",
  },
  {
    title: "4. Seguridad y Auditoría",
    description:
      "Autenticación, niveles de acceso (RLS), bucket privado, bitácora de auditoría y verificación de integridad.",
    icon: ShieldCheck,
    status: "Políticas RLS listas en SQL",
  },
];

export default function Home() {
  const supabaseReady = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const geminiReady = Boolean(process.env.GEMINI_API_KEY);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">SGDI-IA</h1>
              <p className="text-xs text-slate-500">
                Prototipo de Gestión Documental con Inteligencia Artificial
              </p>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            Itinerario: Seguridad
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            Estado inicial del entorno
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Base del proyecto Next.js inicializada. Configura{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono">
              .env.local
            </code>{" "}
            y ejecuta{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono">
              supabase/schema.sql
            </code>{" "}
            para activar la base de datos.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  supabaseReady ? "bg-emerald-500" : "bg-amber-400"
                }`}
              />
              <span>
                Supabase:{" "}
                <strong>{supabaseReady ? "Configurado" : "Pendiente (.env.local)"}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  geminiReady ? "bg-emerald-500" : "bg-amber-400"
                }`}
              />
              <span>
                Gemini API:{" "}
                <strong>{geminiReady ? "Configurado" : "Pendiente (.env.local)"}</strong>
              </span>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.title}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-800">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-slate-900">{mod.title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    {mod.description}
                  </p>
                </div>
                <p className="mt-4 text-xs font-medium text-slate-500">
                  Estado: {mod.status}
                </p>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
