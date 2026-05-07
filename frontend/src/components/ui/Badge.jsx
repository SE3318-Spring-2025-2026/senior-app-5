import clsx from 'clsx';

const colorMap = {
  blue:   'bg-blue-500/15 text-blue-400 border-blue-500/30',
  green:  'bg-green-500/15 text-green-400 border-green-500/30',
  yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  red:    'bg-red-500/15 text-red-400 border-red-500/30',
  slate:  'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

export function Badge({ color = 'slate', children, className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold',
        colorMap[color] ?? colorMap.slate,
        className,
      )}
    >
      {children}
    </span>
  );
}
