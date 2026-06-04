import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prestacao de Contas | Velhos Parceiros F.C.",
  description: "Transparencia financeira e esportiva do Velhos Parceiros F.C.",
  robots: { index: false, follow: false },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-primary text-txt-primary">
      <header className="border-b border-border-subtle bg-surface-secondary/60 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192.svg"
            alt="Escudo Velhos Parceiros F.C."
            className="h-9 w-9 rounded-lg"
            width={36}
            height={36}
          />
          <span className="font-display text-base font-semibold tracking-tight text-txt-primary">
            Velhos Parceiros F.C.
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">{children}</main>
    </div>
  );
}
