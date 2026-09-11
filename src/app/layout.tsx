import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono, Sora } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

/**
 * Display con carácter: los títulos y el wordmark. Reemplaza al par
 * Sora + Newsreader — la serif editorial se leía elegante pero blanda para una
 * herramienta de trabajo.
 */
const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

/** Cuerpo: neutra y de buena lectura en tamaños chicos. */
const sans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

/** Mono: cifras, códigos y patentes. */
const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

/**
 * La tipografía de la MARCA, no de la interfaz.
 *
 * La guía la reserva para el wordmark y títulos destacados: "textos largos y UI
 * pueden combinarse con una tipografía de sistema neutra". Por eso se carga solo
 * el peso 800 y no se usa para el cuerpo.
 */
const marca = Sora({
  variable: "--font-marca",
  subsets: ["latin"],
  weight: ["800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Velie", template: "%s · Velie" },
  description: "CRM e inventario para automotoras.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`dark ${display.variable} ${sans.variable} ${mono.variable} ${marca.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
