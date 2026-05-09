/**
 * Masked red ambient — Student, TeamLeader, Professor (see Layout).
 */
export function MaskedRedAmbientGlow() {
  const maskStyle = {
    WebkitMaskImage:
      'radial-gradient(ellipse 92% 88% at 50% 28%, #000 0%, rgba(0,0,0,0.55) 42%, rgba(0,0,0,0.18) 62%, rgba(0,0,0,0.05) 74%, transparent 82%)',
    maskImage:
      'radial-gradient(ellipse 92% 88% at 50% 28%, #000 0%, rgba(0,0,0,0.55) 42%, rgba(0,0,0,0.18) 62%, rgba(0,0,0,0.05) 74%, transparent 82%)',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskSize: '100% 100%',
    maskSize: '100% 100%',
  };

  return (
    <div
      className="pointer-events-none absolute -left-[42vw] -right-[42vw] -top-32 bottom-0 z-0 min-h-[70vh] sm:-left-[35vw] sm:-right-[35vw]"
      aria-hidden
    >
      <div
        className="absolute left-1/2 top-0 h-[min(115vh,56rem)] w-[min(200vw,80rem)] -translate-x-1/2 -translate-y-[8%]"
        style={maskStyle}
      >
        <div
          className="h-full w-full"
          style={{
            background: `
                  radial-gradient(ellipse 85% 75% at 50% 18%, rgba(239, 68, 68, 0.42), transparent 58%),
                  radial-gradient(ellipse 70% 60% at 72% 45%, rgba(220, 38, 38, 0.28), transparent 52%),
                  radial-gradient(ellipse 90% 85% at 18% 62%, rgba(248, 113, 113, 0.22), transparent 55%)
                `,
          }}
        />
      </div>
    </div>
  );
}
