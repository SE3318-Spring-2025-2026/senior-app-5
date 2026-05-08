import clsx from 'clsx';

const colorMap = {
  blue:   'bg-sky-500/10 text-sky-300 border-sky-500/25',
  green:  'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
  yellow: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
  red:    'bg-rose-500/10 text-rose-300 border-rose-500/25',
  slate:  'bg-[#18181c] text-zinc-300 border-[#26262b]',
  zinc:   'bg-[#18181c] text-zinc-300 border-[#26262b]',
};

export function Badge({ color = 'slate', children, className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
        colorMap[color] ?? colorMap.slate,
        className,
      )}
    >
      {children}
    </span>
  );
}
