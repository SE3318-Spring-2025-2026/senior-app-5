export function extractHeadings(markdown) {
  if (!markdown) return [];
  return markdown
    .split('\n')
    .filter((line) => /^#{1,6}\s/.test(line))
    .map((line) => {
      const text = line.replace(/^#+\s+/, '').trim();
      return {
        text,
        anchor: text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim(),
      };
    });
}
