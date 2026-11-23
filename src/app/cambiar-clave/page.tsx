import { Suspense } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { requireAuthenticatedProfile } from "@/lib/auth";
import { getRoleHomePath } from "@/lib/roles";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

async function ChangePasswordContent() {
  const profile = await requireAuthenticatedProfile({
    allowPasswordChangeRequired: true,
  });

  if (!profile.mustChangePassword) {
    redirect(getRoleHomePath(profile.role));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F4F4] px-4 py-10">
      <div className="w-full max-w-[460px] rounded-2xl bg-white px-7 py-9 shadow-[0_12px_40px_-10px_rgba(122,12,19,0.14)] ring-1 ring-ue-border/60 sm:px-9">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/logo-ue-sanjose.png"
            alt="Unidad Educativa San José"
            width={116}
            height={138}
            priority
            className="h-auto w-28 object-contain"
          />

          <h1 className="mt-4 text-xl font-bold tracking-tight text-ue-crimson">
            Cambio de Contraseña Obligatorio
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-foreground/65">
            Hola <strong className="text-foreground">{profile.fullName}</strong>{" "}
            (C.I. {profile.identification}). Por seguridad, actualiza tu contraseña
            inicial antes de ingresar al sistema.
          </p>
        </div>

        <div className="mt-6">
          <ChangePasswordForm identification={profile.identification} />
        </div>
      </div>
    </div>
  );
}

export default function CambiarClavePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F6F4F4] px-4">
          <div className="h-96 w-full max-w-[460px] animate-pulse rounded-2xl bg-white shadow-sm" />
        </div>
      }
    >
      <ChangePasswordContent />
    </Suspense>
  );
}
