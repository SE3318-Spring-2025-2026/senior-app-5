import { randomUUID } from 'crypto';

export interface ExtractedSection {
  sectionId: string;
  heading: string;
  level: number;
  order: number;
  slug: string;
}

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const FENCE_RE = /^\s*(```|~~~)/;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function extractSections(
  markdown: string,
  prevSections?: ExtractedSection[],
): ExtractedSection[] {
  if (!markdown) return [];

  const lines = markdown.split(/\r?\n/);
  let inFence = false;
  const raw: Array<{ heading: string; level: number }> = [];

  for (const line of lines) {
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = HEADING_RE.exec(line);
    if (!match) continue;

    const level = match[1].length;
    const heading = match[2].trim();
    if (!heading) continue;

    raw.push({ heading, level });
  }

  const slugCounts = new Map<string, number>();
  const sections: ExtractedSection[] = raw.map((r, idx) => {
    const baseSlug = slugify(r.heading) || `section-${idx + 1}`;
    const count = (slugCounts.get(baseSlug) ?? 0) + 1;
    slugCounts.set(baseSlug, count);
    const slug = count === 1 ? baseSlug : `${baseSlug}-${count}`;
    return {
      sectionId: '',
      heading: r.heading,
      level: r.level,
      order: idx,
      slug,
    };
  });

  if (!prevSections || prevSections.length === 0) {
    for (const s of sections) s.sectionId = randomUUID();
    return sections;
  }

  const prevBySlug = new Map<string, ExtractedSection[]>();
  for (const p of prevSections) {
    const arr = prevBySlug.get(p.slug) ?? [];
    arr.push(p);
    prevBySlug.set(p.slug, arr);
  }

  for (const s of sections) {
    const candidates = prevBySlug.get(s.slug);
    if (candidates && candidates.length > 0) {
      s.sectionId = candidates.shift()!.sectionId;
    } else {
      s.sectionId = randomUUID();
    }
  }

  return sections;
}
