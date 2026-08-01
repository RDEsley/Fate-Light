export default function Loading() {
  return (
    <main className="bg-canvas text-foreground grid min-h-screen place-items-center px-6">
      <div aria-live="polite" className="text-center" role="status">
        <span className="bg-brand mx-auto block size-10 animate-pulse rounded-xl motion-reduce:animate-none" />
        <p className="mt-4 font-semibold">Carregando dados do workspace…</p>
      </div>
    </main>
  );
}
