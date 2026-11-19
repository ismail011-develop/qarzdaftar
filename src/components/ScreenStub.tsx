/** Placeholder for a screen that is ported from the approved prototype in the next stage. */
export function ScreenStub({ title, api, proto }: { title: string; api: string[]; proto: string }) {
  return (
    <section className="p-4">
      <h1 className="mb-3 text-xl font-bold">{title}</h1>
      <div className="rounded-qd border border-qd-line bg-qd-card p-4 text-sm text-qd-mute">
        <p className="mb-2">Prototip ekrani: <span className="text-qd-text">{proto}</span></p>
        <p className="mb-1">Ishlatiladigan API:</p>
        <ul className="list-disc pl-5">{api.map((a) => <li key={a}><code>{a}</code></li>)}</ul>
      </div>
    </section>
  );
}
