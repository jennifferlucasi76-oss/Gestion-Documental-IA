import { Suspense } from "react";
import Image from "next/image";
import { LoginForm } from "@/components/LoginForm";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function LoginPage() {
  const supabaseConfigured = isSupabaseConfigured();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F4F4] px-4 py-10">
      <div className="w-full max-w-[400px] rounded-2xl bg-white px-8 py-10 shadow-[0_12px_40px_-10px_rgba(122,12,19,0.14)] ring-1 ring-ue-border/60 sm:px-10">
        <div className="flex flex-col items-center">
          <Image
            src="/logo-ue-sanjose.png"
            alt="Unidad Educativa San José"
            width={150}
            height={178}
            priority
            className="h-auto w-36 object-contain"
          />

          <h1 className="mt-5 text-center text-xl font-bold tracking-tight text-ue-crimson">
            Gestión Documental
          </h1>
        </div>

        <div className="mt-6">
          <Suspense
            fallback={
              <div className="h-40 animate-pulse rounded-xl bg-ue-crimson-soft/40" />
            }
          >
            <LoginForm supabaseConfigured={supabaseConfigured} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
