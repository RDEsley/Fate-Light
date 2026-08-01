"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="bg-canvas text-foreground grid min-h-screen place-items-center px-6">
      <section
        className="border-line bg-surface max-w-lg rounded-2xl border p-8 text-center"
        role="alert"
      >
        <h1 className="text-2xl font-semibold">Não foi possível carregar esta tela</h1>
        <p className="text-muted mt-3">
          Tente novamente. Se o problema continuar, volte ao dashboard.
        </p>
        <button
          className="bg-brand text-brand-contrast mt-6 rounded-xl px-5 py-3 font-semibold"
          onClick={reset}
          type="button"
        >
          Tentar novamente
        </button>
      </section>
    </main>
  );
}
