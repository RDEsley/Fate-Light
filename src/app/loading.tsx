export default function Loading() {
  return (
    <main className="bg-canvas text-foreground grid min-h-screen place-items-center px-6">
      <div aria-live="polite" className="text-center" role="status">
        <span aria-hidden="true" className="cartoon-loader mx-auto" />
        <p className="mt-4 font-semibold">Carregando dados do workspace…</p>
      </div>
    </main>
  );
}
