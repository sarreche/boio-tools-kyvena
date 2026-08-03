import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kyvena",
  description: "Convertí tus fuentes en conocimiento conectado.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
