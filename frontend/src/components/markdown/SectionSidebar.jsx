import PropTypes from 'prop-types';

function scrollEditorToHeading(editor, section) {
  if (!editor) return;
  const { doc } = editor.state;
  let targetPos = null;
  doc.descendants((node, pos) => {
    if (targetPos !== null) return false;
    if (
      node.type.name === 'heading' &&
      node.attrs?.level === section.level &&
      node.textContent === section.heading
    ) {
      targetPos = pos + 1;
      return false;
    }
    return true;
  });
  if (targetPos === null) return;
  editor.chain().focus().setTextSelection(targetPos).scrollIntoView().run();
}

export function SectionSidebar({ sections, editor, activeSectionId }) {
  const ordered = [...(sections || [])].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Sections</p>
      {ordered.length === 0 ? (
        <p className="text-[13px] text-zinc-500">
          No sections yet — add a <code className="text-zinc-300">#</code> heading.
        </p>
      ) : (
        <ul className="space-y-0.5">
          {ordered.map((s) => {
            const isActive = s.sectionId === activeSectionId;
            return (
              <li key={s.sectionId}>
                <button
                  type="button"
                  onClick={() => scrollEditorToHeading(editor, s)}
                  style={{ paddingLeft: `${(s.level - 1) * 12 + 8}px` }}
                  className={
                    'block w-full truncate rounded-md border-l-2 py-1.5 pr-2 text-left text-[13px] transition-colors ' +
                    (isActive
                      ? 'border-zinc-300 bg-[#1f1f23] text-zinc-100'
                      : 'border-transparent text-zinc-400 hover:bg-[#1f1f23] hover:text-zinc-100')
                  }
                  title={s.heading}
                >
                  {s.heading}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

SectionSidebar.propTypes = {
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      sectionId: PropTypes.string.isRequired,
      heading: PropTypes.string.isRequired,
      level: PropTypes.number.isRequired,
      order: PropTypes.number.isRequired,
      slug: PropTypes.string,
    }),
  ),
  editor: PropTypes.object,
  activeSectionId: PropTypes.string,
};

export default SectionSidebar;
