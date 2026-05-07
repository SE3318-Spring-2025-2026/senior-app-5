export function SectionCard({ title, description, children }) {
  return (
    <section className="bg-[#111827] rounded-2xl border border-[#1e293b] p-5">
      <div>
        <h2 className="text-sm font-bold text-slate-200">{title}</h2>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}
