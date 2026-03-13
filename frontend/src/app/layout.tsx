import type { Metadata } from "next";
import { Oswald, DM_Sans, JetBrains_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Velhos Parceiros F.C.",
  description: "Painel de gestao - Velhos Parceiros F.C.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`dark ${oswald.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-surface-primary text-txt-primary font-body antialiased">
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#1A1A1F",
                color: "#F5F5F7",
                border: "1px solid #2A2A35",
              },
              success: {
                iconTheme: {
                  primary: "#E31E24",
                  secondary: "#F5F5F7",
                },
              },
              error: {
                iconTheme: {
                  primary: "#E31E24",
                  secondary: "#F5F5F7",
                },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
