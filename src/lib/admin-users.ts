import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_DEPARTMENT_BY_ROLE,
  identificationToAuthEmail,
  type UserRole,
} from "@/lib/roles";

export interface CreateUserInput {
  fullName: string;
  identification: string;
  institutionalEmail: string;
  role: UserRole;
  department?: string;
}

export interface ManagedUserRecord {
  id: string;
  identification: string;
  full_name: string;
  institutional_email: string | null;
  role: UserRole;
  department: string;
  must_change_password: boolean;
  created_at: string;
}

export const STRICT_EMAIL_REGEX =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const ECUADOR_CEDULA_REGEX = /^\d{10}$/;

export function normalizeIdentification(raw: string): string {
  return raw.trim().replace(/\s+/g, "");
}

export function validateUserFields(input: {
  fullName: string;
  identification: string;
  institutionalEmail: string;
  role: UserRole | null;
  rawRole?: string;
}): string[] {
  const errors: string[] = [];
  const fullName = input.fullName.trim();
  const identification = normalizeIdentification(input.identification);
  const email = input.institutionalEmail.trim().toLowerCase();

  if (fullName.length < 3) {
    errors.push("Faltan nombres completos (mínimo 3 caracteres).");
  }

  if (!identification) {
    errors.push("Falta el número de cédula.");
  } else if (!/^\d+$/.test(identification)) {
    errors.push("La cédula solo debe contener dígitos numéricos.");
  } else if (!ECUADOR_CEDULA_REGEX.test(identification)) {
    errors.push(
      `La cédula ecuatoriana debe tener exactamente 10 dígitos (tiene ${identification.length}).`
    );
  }

  if (!email) {
    errors.push("Falta el correo electrónico.");
  } else if (!STRICT_EMAIL_REGEX.test(email)) {
    errors.push(
      "Correo no válido (debe incluir @ y un dominio válido, ej. usuario@gmail.com)."
    );
  }

  if (!input.role) {
    errors.push(
      input.rawRole?.trim()
        ? `Rol no válido: "${input.rawRole.trim()}".`
        : "No se escogió un rol."
    );
  }

  return errors;
}

export async function createManagedUser(
  admin: SupabaseClient,
  input: CreateUserInput
): Promise<
  | { ok: true; user: ManagedUserRecord }
  | { ok: false; error: string }
> {
  const fullName = input.fullName.trim();
  const identification = normalizeIdentification(input.identification);
  const institutionalEmail = input.institutionalEmail.trim().toLowerCase();
  const department =
    input.department?.trim() || DEFAULT_DEPARTMENT_BY_ROLE[input.role];

  const fieldErrors = validateUserFields({
    fullName,
    identification,
    institutionalEmail,
    role: input.role,
  });

  if (fieldErrors.length > 0) {
    return { ok: false, error: fieldErrors.join(" ") };
  }

  // Verificar si ya existe la cédula en profiles
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("identification", identification)
    .maybeSingle();

  if (existingProfile) {
    return {
      ok: false,
      error: `Ya existe un usuario registrado con la cédula ${identification}.`,
    };
  }

  const authEmail = identificationToAuthEmail(identification);

  // Contraseña inicial por defecto = número de cédula (obligatorio cambiar en el primer ingreso)
  const { data: createdAuth, error: createErr } =
    await admin.auth.admin.createUser({
      email: authEmail,
      password: identification,
      email_confirm: true,
      user_metadata: {
        identification,
        full_name: fullName,
        department,
      },
    });

  if (createErr || !createdAuth.user) {
    const msg = createErr?.message || "No se pudo crear la cuenta de acceso.";
    if (msg.toLowerCase().includes("already")) {
      return {
        ok: false,
        error: `Ya existe una cuenta registrada para la cédula ${identification}.`,
      };
    }
    return { ok: false, error: msg };
  }

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .upsert({
      id: createdAuth.user.id,
      identification,
      full_name: fullName,
      institutional_email: institutionalEmail,
      role: input.role,
      department,
      must_change_password: true,
    })
    .select(
      "id, identification, full_name, institutional_email, role, department, must_change_password, created_at"
    )
    .single();

  if (profileErr || !profile) {
    await admin.auth.admin.deleteUser(createdAuth.user.id);
    return {
      ok: false,
      error:
        profileErr?.message ||
        "No se pudo guardar el perfil del usuario en la base de datos.",
    };
  }

  return {
    ok: true,
    user: profile as ManagedUserRecord,
  };
}
