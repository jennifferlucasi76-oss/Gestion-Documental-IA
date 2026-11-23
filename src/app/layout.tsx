import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SGDI-IA | Unidad Educativa San José",
  description:
    "Prototipo de modelo de gestión documental basado en inteligencia artificial para la clasificación y recuperación de información — Unidad Educativa San José, Guayaquil.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-ue-crimson/15 selection:text-ue-crimson-dark">
        {children}
      </body>
    </html>
  );
}
