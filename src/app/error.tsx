"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="empty-state" role="alert">
      <div className="empty-state-inner">
        <h1>No pudimos cargar Kyvena</h1>
        <p>Intentá nuevamente. Si el problema continúa, revisaremos la configuración del servicio.</p>
        <button className="primary-button" onClick={reset}>Reintentar</button>
      </div>
    </main>
  );
}
