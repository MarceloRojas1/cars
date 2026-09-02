import type { Metadata } from "next";
import { Newsreader, IBM_Plex_Sans, IBM_Plex_Mono, Sora } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

/** Tipografía de marca. Reservada al wordmark, según la guía. */
const marca = Sora({
  variable: "--font-marca",
  subsets: ["latin"],
  weight: ["800"],
  display: "swap",
});

/** Serif editorial: solo títulos y cifras grandes. */
const serif = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

/** Sans de interfaz: todo lo que se lee en pantalla pequeña. */
const sans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

/** Mono: cifras, códigos y patentes. */
const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
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
      className={`dark ${marca.variable} ${serif.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
