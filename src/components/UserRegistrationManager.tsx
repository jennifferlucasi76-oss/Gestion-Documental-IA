"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  KeyRound,
  Loader2,
  Search,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import {
  ASSIGNABLE_USER_ROLES,
  EXCEL_ROLE_LABELS,
  type UserRole,
} from "@/lib/roles";

export interface DirectoryUser {
  id: string;
  identification: string;
  full_name: string;
  institutional_email: string | null;
  role: UserRole;
  department: string;
  must_change_password: boolean;
  created_at: string;
}

interface BulkRowResult {
  rowNumber: number;
  fullName: string;
  identification: string;
  institutionalEmail: string;
  role: UserRole | null;
  status: "created" | "error";
  message: string;
}

interface BulkResponse {
  totalProcessed: number;
  createdCount: number;
  errorCount: number;
  results: BulkRowResult[];
}

const ROLE_BADGE_STYLES: Record<UserRole, string> = {
  rector: "bg-ue-crimson text-white",
  secretaria: "bg-ue-gold-soft text-[#7A5900] border border-ue-gold-dark/25",
  coordinador: "bg-ue-crimson-soft text-ue-crimson border border-ue-crimson/20",
  docente: "bg-[#F3F4F6] text-foreground border border-ue-border",
};

const ROLE_SHORT_LABELS: Record<UserRole, string> = {
  rector: "Rector / Directivo",
  secretaria: "Personal Administrativo",
  coordinador: "Coordinador de Área",
  docente: "Docente",
};

export function UserRegistrationManager({
  initialUsers,
  currentUserId,
}: {
  initialUsers: DirectoryUser[];
  currentUserId: string;
}) {
  const [activeTab, setActiveTab] = useState<"individual" | "masivo">(
    "individual"
  );
  const [users, setUsers] = useState<DirectoryUser[]>(initialUsers);

  // Estado formulario individual (sin contraseña ni departamento: clave por defecto = cédula)
  const [fullName, setFullName] = useState("");
  const [identification, setIdentification] = useState("");
  const [institutionalEmail, setInstitutionalEmail] = useState("");
  const [role, setRole] = useState<UserRole>("docente");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Estado carga masiva Excel
  const [templateRows, setTemplateRows] = useState<number>(20);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkResponse | null>(null);

  // Estado tabla directorio
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function refreshUsers() {
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { users: DirectoryUser[] };
      setUsers(data.users);
    }
  }

  async function handleCreateUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setCreating(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          identification,
          institutionalEmail,
          role,
        }),
      });

      const payload = (await res.json()) as {
        user?: DirectoryUser;
        error?: string;
      };

      if (!res.ok) {
        setFormError(payload.error || "No se pudo registrar el usuario.");
        return;
      }

      setFormSuccess(
        `Usuario ${payload.user?.full_name} registrado correctamente. Su clave inicial es su cédula (${payload.user?.identification}) y deberá cambiarla en su primer ingreso.`
      );
      setFullName("");
      setIdentification("");
      setInstitutionalEmail("");
      await refreshUsers();
    } catch {
      setFormError("Error de conexión al intentar registrar el usuario.");
    } finally {
      setCreating(false);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setBulkError(null);
    setBulkResult(null);
    const selected = e.target.files?.[0] ?? null;
    if (selected && !selected.name.toLowerCase().endsWith(".xlsx")) {
      setBulkError("Selecciona un archivo Excel válido (.xlsx).");
      setExcelFile(null);
      return;
    }
    setExcelFile(selected);
  }

  async function handleBulkUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBulkError(null);
    setBulkResult(null);

    if (!excelFile) {
      setBulkError("Primero selecciona el archivo Excel (.xlsx) con los usuarios.");
      return;
    }

    setUploadingBulk(true);
    try {
      const formData = new FormData();
      formData.append("file", excelFile);

      const res = await fetch("/api/admin/users/bulk", {
        method: "POST",
        body: formData,
      });

      const payload = (await res.json()) as BulkResponse & { error?: string };

      if (!res.ok) {
        setBulkError(payload.error || "No se pudo procesar el archivo Excel.");
        return;
      }

      setBulkResult(payload);
      setExcelFile(null);
      await refreshUsers();
    } catch {
      setBulkError("Error de conexión al cargar el archivo Excel.");
    } finally {
      setUploadingBulk(false);
    }
  }

  async function handleDeleteUser(user: DirectoryUser) {
    if (
      !window.confirm(
        `¿Seguro que deseas eliminar la cuenta de ${user.full_name} (C.I. ${user.identification})?`
      )
    ) {
      return;
    }

    setDeletingId(user.id);
    try {
      const res = await fetch(
        `/api/admin/users?id=${encodeURIComponent(user.id)}`,
        {
          method: "DELETE",
        }
      );
      if (res.ok) {
        setUsers((prev) => prev.filter((item) => item.id !== user.id));
      }
    } finally {
      setDeletingId(null);
    }
  }

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      u.full_name.toLowerCase().includes(q) ||
      u.identification.toLowerCase().includes(q) ||
      (u.institutional_email ?? "").toLowerCase().includes(q) ||
      u.department.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Selector de los 2 medios de registro */}
      <section className="rounded-3xl border border-ue-border bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-ue-border pb-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Alta de Usuarios Institucionales
            </h2>
            <p className="mt-0.5 text-sm text-foreground/65">
              Registra colaboradores de forma individual o mediante carga masiva
              con el formato oficial de Excel.
            </p>
          </div>

          <div className="inline-grid grid-cols-2 rounded-xl border border-ue-border bg-ue-crimson-soft/60 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("individual")}
              className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                activeTab === "individual"
                  ? "bg-ue-crimson text-white shadow-sm"
                  : "text-foreground/75 hover:text-ue-crimson"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Registro Individual
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("masivo")}
              className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                activeTab === "masivo"
                  ? "bg-ue-crimson text-white shadow-sm"
                  : "text-foreground/75 hover:text-ue-crimson"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Carga Masiva (Excel)
            </button>
          </div>
        </div>

        {/* Nota de política de contraseña inicial */}
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-ue-gold-dark/25 bg-ue-gold-soft/75 px-4 py-3 text-xs text-[#594300]">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-ue-gold-dark" />
          <p className="leading-relaxed">
            <strong>Política de primer acceso:</strong> al crear cualquier usuario
            (individual o por Excel), su contraseña inicial será automáticamente
            su <strong>número de cédula</strong>. Al iniciar sesión por primera
            vez, el sistema le pedirá obligatoriamente definir una contraseña
            segura.
          </p>
        </div>

        {/* MEDIO 1: REGISTRO INDIVIDUAL */}
        {activeTab === "individual" && (
          <div className="mt-5">
            {formError && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2.5 rounded-xl border border-ue-crimson/25 bg-ue-crimson-soft px-4 py-3 text-sm text-ue-crimson-dark"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-ue-crimson" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div
                role="status"
                className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-600/25 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form
              onSubmit={handleCreateUser}
              className="grid gap-4 sm:grid-cols-2"
            >
              <div>
                <label
                  htmlFor="reg-fullname"
                  className="mb-1.5 block text-xs font-semibold text-foreground/80"
                >
                  Nombres completos *
                </label>
                <input
                  id="reg-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej. María Fernanda Torres López"
                  className="w-full rounded-xl border border-ue-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-ue-crimson focus:bg-white focus:ring-2 focus:ring-ue-crimson/15"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-id"
                  className="mb-1.5 block text-xs font-semibold text-foreground/80"
                >
                  Cédula / Número de identificación *
                </label>
                <input
                  id="reg-id"
                  type="text"
                  inputMode="numeric"
                  required
                  value={identification}
                  onChange={(e) => setIdentification(e.target.value)}
                  placeholder="Ej. 0912345678"
                  className="w-full rounded-xl border border-ue-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-ue-crimson focus:bg-white focus:ring-2 focus:ring-ue-crimson/15"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-email"
                  className="mb-1.5 block text-xs font-semibold text-foreground/80"
                >
                  Correo institucional *
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={institutionalEmail}
                  onChange={(e) => setInstitutionalEmail(e.target.value)}
                  placeholder="Ej. mtorres@uesanjose.edu.ec"
                  className="w-full rounded-xl border border-ue-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-ue-crimson focus:bg-white focus:ring-2 focus:ring-ue-crimson/15"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-role"
                  className="mb-1.5 block text-xs font-semibold text-foreground/80"
                >
                  Rol en el sistema *
                </label>
                <select
                  id="reg-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full rounded-xl border border-ue-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-ue-crimson focus:bg-white focus:ring-2 focus:ring-ue-crimson/15"
                >
                  {ASSIGNABLE_USER_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {EXCEL_ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-xl bg-ue-crimson px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ue-crimson-dark disabled:opacity-60"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 text-ue-gold" />
                      Registrar usuario
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MEDIO 2: CARGA MASIVA POR EXCEL */}
        {activeTab === "masivo" && (
          <div className="mt-5 space-y-5">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Paso 1: Descargar plantilla con cantidad configurable */}
              <div className="flex flex-col justify-between rounded-2xl border border-ue-border bg-background p-5">
                <div>
                  <span className="inline-flex rounded-full bg-ue-gold-soft px-2.5 py-0.5 text-[11px] font-bold text-[#7A5900]">
                    Paso 1
                  </span>
                  <h3 className="mt-2 text-base font-bold text-foreground">
                    Descarga el formato oficial de Excel
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-foreground/70">
                    Plantilla institucional con el escudo de la Unidad Educativa
                    San José y las columnas de{" "}
                    <strong>
                      Nombres Completos, Cédula, Correo Institucional y Rol
                    </strong>{" "}
                    (combobox desplegable con Personal Administrativo, Docente y
                    Coordinador de Área).
                  </p>

                  <div className="mt-4 rounded-xl border border-ue-border bg-white p-3.5">
                    <label
                      htmlFor="template-rows"
                      className="block text-xs font-semibold text-foreground/85"
                    >
                      Número de usuarios en la plantilla
                    </label>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        id="template-rows"
                        type="number"
                        min={1}
                        max={500}
                        value={templateRows}
                        onChange={(e) => {
                          const parsed = Number.parseInt(e.target.value, 10);
                          if (Number.isNaN(parsed)) {
                            setTemplateRows(1);
                          } else {
                            setTemplateRows(Math.min(500, Math.max(1, parsed)));
                          }
                        }}
                        className="w-24 rounded-lg border border-ue-border bg-background px-3 py-1.5 text-center text-sm font-bold text-ue-crimson outline-none focus:border-ue-crimson focus:bg-white focus:ring-2 focus:ring-ue-crimson/15"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {[10, 25, 50, 100].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setTemplateRows(preset)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                              templateRows === preset
                                ? "bg-ue-crimson text-white"
                                : "border border-ue-border bg-background text-foreground/75 hover:border-ue-crimson/40 hover:text-ue-crimson"
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="mt-1.5 text-[11px] text-ue-gray">
                      Se generarán exactamente {templateRows} filas numeradas con
                      lista desplegable en la columna Rol (máx. 500).
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <a
                    href={`/api/admin/users/template?rows=${templateRows}`}
                    download={`Formato_Registro_Usuarios_UE_San_Jose_${templateRows}.xlsx`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ue-crimson px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ue-crimson-dark"
                  >
                    <Download className="h-4 w-4 text-ue-gold" />
                    Descargar plantilla ({templateRows}{" "}
                    {templateRows === 1 ? "usuario" : "usuarios"})
                  </a>
                </div>
              </div>

              {/* Paso 2: Subir archivo completado */}
              <form
                onSubmit={handleBulkUpload}
                className="flex flex-col justify-between rounded-2xl border border-ue-border bg-background p-5"
              >
                <div>
                  <span className="inline-flex rounded-full bg-ue-crimson-soft px-2.5 py-0.5 text-[11px] font-bold text-ue-crimson">
                    Paso 2
                  </span>
                  <h3 className="mt-2 text-base font-bold text-foreground">
                    Sube el archivo completado
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-foreground/70">
                    Cada usuario se creará con su cédula como contraseña inicial
                    temporal y se le exigirá cambiarla al ingresar por primera
                    vez.
                  </p>

                  <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-ue-crimson/30 bg-white px-4 py-5 text-center transition hover:border-ue-crimson hover:bg-ue-crimson-soft/30">
                    <FileSpreadsheet className="h-7 w-7 text-ue-crimson" />
                    <span className="mt-2 text-xs font-semibold text-foreground">
                      {excelFile
                        ? excelFile.name
                        : "Haz clic para seleccionar tu archivo .xlsx"}
                    </span>
                    <span className="mt-0.5 text-[11px] text-ue-gray">
                      {excelFile
                        ? `${(excelFile.size / 1024).toFixed(1)} KB listo para importar`
                        : "Solo archivos Excel (.xlsx) hasta 5 MB"}
                    </span>
                    <input
                      type="file"
                      accept=".xlsx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="mt-4">
                  <button
                    type="submit"
                    disabled={!excelFile || uploadingBulk}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ue-crimson px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ue-crimson-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploadingBulk ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Procesando usuarios...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 text-ue-gold" />
                        Importar usuarios masivamente
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {bulkError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-ue-crimson/25 bg-ue-crimson-soft px-4 py-3 text-sm text-ue-crimson-dark"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-ue-crimson" />
                <span>{bulkError}</span>
              </div>
            )}

            {bulkResult && (
              <div className="rounded-2xl border border-ue-border bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ue-border pb-3">
                  <h4 className="text-sm font-bold text-foreground">
                    Resultado de la carga masiva
                  </h4>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-background px-3 py-1 text-foreground border border-ue-border">
                      Procesados: {bulkResult.totalProcessed}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 border border-emerald-600/20">
                      Creados: {bulkResult.createdCount}
                    </span>
                    <span className="rounded-full bg-ue-crimson-soft px-3 py-1 text-ue-crimson border border-ue-crimson/20">
                      Con error: {bulkResult.errorCount}
                    </span>
                  </div>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-ue-border text-ue-gray">
                        <th className="py-2 pr-3 font-semibold">Fila</th>
                        <th className="py-2 pr-3 font-semibold">Nombres</th>
                        <th className="py-2 pr-3 font-semibold">Cédula</th>
                        <th className="py-2 pr-3 font-semibold">Rol</th>
                        <th className="py-2 pr-3 font-semibold">Estado</th>
                        <th className="py-2 font-semibold">Detalle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ue-border/60">
                      {bulkResult.results.map((item) => (
                        <tr key={`${item.rowNumber}-${item.identification}`}>
                          <td className="py-2 pr-3 font-semibold text-foreground/70">
                            {item.rowNumber}
                          </td>
                          <td className="py-2 pr-3 font-medium text-foreground">
                            {item.fullName || "—"}
                          </td>
                          <td className="py-2 pr-3 font-mono text-foreground/80">
                            {item.identification || "—"}
                          </td>
                          <td className="py-2 pr-3">
                            {item.role ? ROLE_SHORT_LABELS[item.role] : "—"}
                          </td>
                          <td className="py-2 pr-3">
                            {item.status === "created" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                                <CheckCircle2 className="h-3 w-3" />
                                Creado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-ue-crimson-soft px-2 py-0.5 font-semibold text-ue-crimson">
                                <AlertCircle className="h-3 w-3" />
                                Error
                              </span>
                            )}
                          </td>
                          <td className="py-2 text-foreground/75">
                            {item.message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Directorio de usuarios registrados */}
      <section className="rounded-3xl border border-ue-border bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ue-crimson-soft text-ue-crimson">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Usuarios Registrados ({users.length})
              </h3>
              <p className="text-xs text-foreground/65">
                Cuentas institucionales activas con acceso por número de cédula.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ue-gray" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar nombre o cédula..."
                className="w-56 rounded-xl border border-ue-border bg-background py-1.5 pl-8 pr-3 text-xs text-foreground outline-none focus:border-ue-crimson focus:bg-white"
              />
            </div>

            <select
              aria-label="Filtrar por rol"
              value={roleFilter}
              onChange={(e) =>
                setRoleFilter(e.target.value as "all" | UserRole)
              }
              className="rounded-xl border border-ue-border bg-background px-3 py-1.5 text-xs font-medium text-foreground outline-none focus:border-ue-crimson focus:bg-white"
            >
              <option value="all">Todos los roles</option>
              <option value="rector">Rector / Directivo</option>
              <option value="secretaria">Personal Administrativo</option>
              <option value="docente">Docente</option>
              <option value="coordinador">Coordinador de Área</option>
            </select>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ue-border text-xs uppercase tracking-wider text-ue-gray">
                <th className="py-3 pr-4 font-semibold">Nombres</th>
                <th className="py-3 pr-4 font-semibold">Cédula</th>
                <th className="py-3 pr-4 font-semibold">Correo Institucional</th>
                <th className="py-3 pr-4 font-semibold">Rol</th>
                <th className="py-3 pr-4 font-semibold">Clave</th>
                <th className="py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ue-border/70">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-sm text-ue-gray"
                  >
                    No se encontraron usuarios con ese criterio.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-ue-crimson-soft/20">
                    <td className="py-3 pr-4 font-semibold text-foreground">
                      {u.full_name}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-foreground/80">
                      {u.identification}
                    </td>
                    <td className="py-3 pr-4 text-xs text-foreground/75">
                      {u.institutional_email || "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ROLE_BADGE_STYLES[u.role]}`}
                      >
                        {ROLE_SHORT_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      {u.must_change_password ? (
                        <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-500/25">
                          Pendiente cambio
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-500/20">
                          Actualizada
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {u.id === currentUserId ? (
                        <span className="text-[11px] font-medium text-ue-gray">
                          Sesión actual
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          disabled={deletingId === u.id}
                          title="Eliminar usuario"
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-ue-crimson transition hover:bg-ue-crimson-soft disabled:opacity-50"
                        >
                          {deletingId === u.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
