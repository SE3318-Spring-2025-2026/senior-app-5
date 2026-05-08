export function PageHeader({ title, subtitle, actions, eyebrow }) {
  return (
    <div className="mb-7 flex items-end justify-between gap-4 border-b border-[#1c1c20] pb-5">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[22px] font-semibold tracking-tight text-zinc-100">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-zinc-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
