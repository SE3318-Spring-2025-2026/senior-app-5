import { extractSections, slugify } from './section-extractor';

describe('slugify', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('strips punctuation', () => {
    expect(slugify('What is Up?!')).toBe('what-is-up');
  });
});

describe('extractSections', () => {
  it('returns empty for empty input', () => {
    expect(extractSections('')).toEqual([]);
  });

  it('extracts ATX headings with levels and order', () => {
    const md = '# A\n\n## B\n\n### C';
    const out = extractSections(md);
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({
      heading: 'A',
      level: 1,
      order: 0,
      slug: 'a',
    });
    expect(out[1]).toMatchObject({
      heading: 'B',
      level: 2,
      order: 1,
      slug: 'b',
    });
    expect(out[2]).toMatchObject({
      heading: 'C',
      level: 3,
      order: 2,
      slug: 'c',
    });
    out.forEach((s) => expect(s.sectionId).toMatch(/[0-9a-f-]{36}/));
  });

  it('disambiguates duplicate headings', () => {
    const out = extractSections('# Intro\n# Intro\n# Intro');
    expect(out.map((s) => s.slug)).toEqual(['intro', 'intro-2', 'intro-3']);
  });

  it('skips headings inside fenced code blocks', () => {
    const md = '# Real\n\n```\n# Fake\n```\n\n## Also Real';
    const out = extractSections(md);
    expect(out.map((s) => s.heading)).toEqual(['Real', 'Also Real']);
  });

  it('trims trailing hashes', () => {
    const out = extractSections('# Title ##');
    expect(out[0].heading).toBe('Title');
  });

  it('keeps section IDs stable across body edits when slug unchanged', () => {
    const v1 = extractSections('# Goals\n\nold body');
    const v2 = extractSections('# Goals\n\nnew body', v1);
    expect(v2[0].sectionId).toBe(v1[0].sectionId);
  });

  it('mints a new ID when a heading is renamed', () => {
    const v1 = extractSections('# Goals');
    const v2 = extractSections('# Objectives', v1);
    expect(v2[0].sectionId).not.toBe(v1[0].sectionId);
  });

  it('keeps IDs with reordered headings since matching is by slug', () => {
    const v1 = extractSections('# A\n# B');
    const v2 = extractSections('# B\n# A', v1);
    const v1A = v1.find((s) => s.slug === 'a')!.sectionId;
    const v1B = v1.find((s) => s.slug === 'b')!.sectionId;
    expect(v2.find((s) => s.slug === 'a')!.sectionId).toBe(v1A);
    expect(v2.find((s) => s.slug === 'b')!.sectionId).toBe(v1B);
  });

  it('ignores empty heading lines', () => {
    const out = extractSections('#   \n# Real');
    expect(out).toHaveLength(1);
    expect(out[0].heading).toBe('Real');
  });
});
