export type UserRole = "rector" | "secretaria" | "docente" | "coordinador";

export interface RoleModuleCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  iconName:
    | "bar-chart"
    | "shield-check"
    | "file-check"
    | "upload"
    | "sparkles"
    | "search"
    | "file-plus"
    | "book-open"
    | "heart-handshake"
    | "clipboard-check"
    | "layers"
    | "brain";
}

export interface RoleMetricCard {
  label: string;
  value: string;
  hint: string;
}

export interface RoleDefinition {
  key: UserRole;
  path: string;
  shortLabel: string;
  title: string;
  badge: string;
  principalRole: string;
  welcomeSubtitle: string;
  metrics: RoleMetricCard[];
  modules: RoleModuleCard[];
}

export const INTERNAL_AUTH_DOMAIN = "uesanjose.edu.ec";

/**
 * Convierte un número de identificación (cédula) al correo interno usado en Supabase Auth.
 */
export function identificationToAuthEmail(rawIdentification: string): string {
  const cleaned = rawIdentification.trim();
  if (cleaned.includes("@")) {
    return cleaned.toLowerCase();
  }
  const normalized = cleaned.replace(/\s+/g, "");
  return `${normalized}@${INTERNAL_AUTH_DOMAIN}`;
}

export function isValidRole(value: unknown): value is UserRole {
  return (
    value === "rector" ||
    value === "secretaria" ||
    value === "docente" ||
    value === "coordinador"
  );
}

export function getRoleHomePath(role: UserRole): string {
  return ROLE_CONFIG[role].path;
}

export const ALL_ROLES: UserRole[] = [
  "rector",
  "secretaria",
  "docente",
  "coordinador",
];

export const ROLE_CONFIG: Record<UserRole, RoleDefinition> = {
  rector: {
    key: "rector",
    path: "/panel/rector",
    shortLabel: "Rector / Directivo",
    title: "Rector / Equipo Directivo",
    badge: "Administrador",
    principalRole: "Usuario supervisor y tomador de decisiones estratégicas.",
    welcomeSubtitle:
      "Supervisión ejecutiva, trazabilidad normativa ante el Ministerio de Educación y gobierno de políticas documentales.",
    metrics: [
      {
        label: "Documentos indexados",
        value: "0",
        hint: "Repositorio institucional centralizado",
      },
      {
        label: "Cumplimiento MINEDUC",
        value: "—",
        hint: "Trazabilidad de entregas oficiales",
      },
      {
        label: "Políticas y taxonomía",
        value: "7",
        hint: "Tipos documentales configurados",
      },
      {
        label: "Usuarios activos",
        value: "1",
        hint: "Perfiles con control de acceso RLS",
      },
    ],
    modules: [
      {
        id: "consulta-ejecutiva",
        title: "Consulta Ejecutiva",
        subtitle: "Reportes gerenciales e indicadores IA",
        description:
          "Acceso a reportes gerenciales, estadísticas de almacenamiento y consolidados institucionales generados automáticamente por el modelo de IA.",
        iconName: "bar-chart",
      },
      {
        id: "supervision-cumplimiento",
        title: "Supervisión de Cumplimiento",
        subtitle: "Trazabilidad ante organismos de control",
        description:
          "Verificación de la trazabilidad en la entrega de documentos oficiales ante los requerimientos de los organismos de control del Ministerio de Educación.",
        iconName: "shield-check",
      },
      {
        id: "aprobacion-politicas",
        title: "Aprobación de Políticas Documentales",
        subtitle: "Taxonomía y jerarquía de permisos",
        description:
          "Validación de la taxonomía y la jerarquía de permisos institucionales dentro del prototipo.",
        iconName: "file-check",
      },
    ],
  },

  secretaria: {
    key: "secretaria",
    path: "/panel/secretaria",
    shortLabel: "Secretaría / Admin",
    title: "Secretario / Personal Administrativo",
    badge: "Gestor de Archivos",
    principalRole:
      "Usuario operador principal (Gestor de archivos y digitalización).",
    welcomeSubtitle:
      "Digitalización, validación de clasificación asistida por NLP y despacho oportuno de expedientes institucionales.",
    metrics: [
      {
        label: "Activos digitalizados",
        value: "0",
        hint: "PDFs, actas, oficios y matrículas",
      },
      {
        label: "Pendientes de validar",
        value: "0",
        hint: "Etiquetas sugeridas por NLP",
      },
      {
        label: "Búsquedas atendidas",
        value: "0",
        hint: "Despacho interno y externo",
      },
      {
        label: "Integridad SHA-256",
        value: "100%",
        hint: "Verificación criptográfica lista",
      },
    ],
    modules: [
      {
        id: "ingreso-digitalizacion",
        title: "Ingreso y Digitalización de Activos",
        subtitle: "Carga centralizada al repositorio",
        description:
          "Carga de documentos (PDFs, actas escaneadas, oficios, matrículas) al repositorio del prototipo.",
        iconName: "upload",
      },
      {
        id: "clasificacion-ia",
        title: "Clasificación Asistida por IA",
        subtitle: "Validación de etiquetas y metadatos NLP",
        description:
          "Supervisión y validación de las etiquetas, metadatos y categorías sugeridas automáticamente por el algoritmo de Procesamiento de Lenguaje Natural (NLP).",
        iconName: "sparkles",
      },
      {
        id: "busqueda-despacho",
        title: "Búsqueda y Despacho",
        subtitle: "Recuperación semántica inmediata",
        description:
          "Utilización del módulo de recuperación semántica para localizar de forma inmediata expedientes de estudiantes, resoluciones o archivos históricos ante solicitudes internas o externas.",
        iconName: "search",
      },
    ],
  },

  docente: {
    key: "docente",
    path: "/panel/docente",
    shortLabel: "Docente",
    title: "Docente",
    badge: "Gestión Académica",
    principalRole: "Usuario generador y consultor de documentación académica.",
    welcomeSubtitle:
      "Entrega estandarizada de planificaciones, consulta de directrices institucionales y seguimiento estudiantil autorizado.",
    metrics: [
      {
        label: "Entregables subidos",
        value: "0",
        hint: "Planificaciones y actas parciales",
      },
      {
        label: "En revisión de área",
        value: "0",
        hint: "Pendientes de validación",
      },
      {
        label: "Circulares vigentes",
        value: "0",
        hint: "Directrices y formatos indexados",
      },
      {
        label: "Reportes DECE",
        value: "0",
        hint: "Acceso restringido autorizado",
      },
    ],
    modules: [
      {
        id: "generacion-entregables",
        title: "Generación de Entregables",
        subtitle: "Planificaciones, notas y actas parciales",
        description:
          "Subida de planificaciones microcurriculares, registros de calificaciones y actas parciales en los formatos estandarizados por la institución.",
        iconName: "file-plus",
      },
      {
        id: "consulta-academica",
        title: "Consulta Académica Autorizada",
        subtitle: "Directrices, circulares y formatos",
        description:
          "Búsqueda rápida de directrices institucionales, circulares o formatos pedagógicos indexados por el sistema inteligente.",
        iconName: "book-open",
      },
      {
        id: "seguimiento-estudiantil",
        title: "Seguimiento Estudiantil",
        subtitle: "Informes específicos y reportes DECE",
        description:
          "Acceso restringido y seguro a informes específicos o reportes del Departamento de Consejería Estudiantil (DECE) según su nivel de autorización.",
        iconName: "heart-handshake",
      },
    ],
  },

  coordinador: {
    key: "coordinador",
    path: "/panel/coordinador",
    shortLabel: "Coordinador de Área",
    title: "Coordinador de Área",
    badge: "Validador de Área",
    principalRole:
      "Usuario validador y articulador de procesos académicos-administrativos.",
    welcomeSubtitle:
      "Validación de entregas docentes, consolidados departamentales para juntas y fortalecimiento semántico de la base de conocimiento.",
    metrics: [
      {
        label: "Por revisar",
        value: "0",
        hint: "Planificaciones y reportes docentes",
      },
      {
        label: "Documentos aprobados",
        value: "0",
        hint: "Con control de versiones",
      },
      {
        label: "Consolidados de área",
        value: "0",
        hint: "Auditorías internas y Juntas de Área",
      },
      {
        label: "Etiquetas cruzadas",
        value: "0",
        hint: "Base de conocimiento del área",
      },
    ],
    modules: [
      {
        id: "revision-aprobacion",
        title: "Revisión y Aprobación Documental",
        subtitle: "Validación y control de versiones",
        description:
          "Validación de las planificaciones y reportes presentados por los docentes de su área, utilizando el sistema para verificar versiones y historiales de modificación.",
        iconName: "clipboard-check",
      },
      {
        id: "generacion-consolidados",
        title: "Generación de Consolidados",
        subtitle: "Auditorías internas y Juntas de Área",
        description:
          "Recuperación automatizada de la producción documental de su departamento para auditorías internas o Juntas de Área.",
        iconName: "layers",
      },
      {
        id: "base-conocimiento",
        title: "Alimentación de la Base de Conocimiento",
        subtitle: "Clasificación cruzada para IA",
        description:
          "Clasificación cruzada de documentos técnicos y pedagógicos para que la IA mejore la precisión en la recuperación de temáticas específicas de su área.",
        iconName: "brain",
      },
    ],
  },
};
