export function SectionCard({ title, description, children, action }) {
  return (
    <section className="rounded-2xl border border-[#1f1f23] bg-[#131316] p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold tracking-tight text-zinc-100">{title}</h2>
          {description && (
            <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-500">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div>{children}</div>
    </section>
  );
}
