export const LEGACY_MEMO_INTRO_LINES = [
  'Time flows through us, like wind through a corridor.',
  'There are always moments carrying a particular scent or light, lingering briefly before fading away.',
  'Some feelings can’t be captured by a lens; some memories are hard to preserve in images.',
  'Perhaps leaving a written record of a fleeting feeling is the gentlest yet most effective way to resist forgetting.'
] as const;

export type MemoMarkdownSections = {
  introMarkdown: string;
  contentMarkdown: string;
  hasBodyIntro: boolean;
};

export type MemoRenderedSections = {
  introHtml: string;
  contentHtml: string;
};

export type MemoHeading = {
  depth: number;
  text?: string;
  slug: string;
};

export type MemoTocItem = {
  text: string;
  slug: string;
};

export type MemoTocGroup = {
  title: string;
  items: MemoTocItem[];
};

type FenceState = {
  marker: '`' | '~';
  length: number;
};

const FENCE_OPEN_RE = /^( {0,3})(`{3,}|~{3,})/;
const H2_RE = /^( {0,3})##(?!#)(?:[ \t]+|$)/;
const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getFenceOpen = (line: string): FenceState | null => {
  const match = FENCE_OPEN_RE.exec(line);
  if (!match) return null;

  const sequence = match[2] ?? '';
  const marker = sequence[0];
  if (marker !== '`' && marker !== '~') return null;

  return {
    marker,
    length: sequence.length
  };
};

const isFenceClose = (line: string, fence: FenceState): boolean => {
  const markerPattern = fence.marker === '`' ? '`' : '~';
  const closeRe = new RegExp(`^( {0,3})\\${markerPattern}{${fence.length},}[ \\t]*$`);
  return closeRe.test(line);
};

export const findFirstMemoContentHeadingOffset = (source: string): number => {
  let offset = 0;
  let fence: FenceState | null = null;

  while (offset <= source.length) {
    const nextLineFeed = source.indexOf('\n', offset);
    const lineEndIndex = nextLineFeed === -1 ? source.length : nextLineFeed;
    const rawLine = source.slice(offset, lineEndIndex);
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;

    if (fence) {
      if (isFenceClose(line, fence)) fence = null;
    } else {
      const nextFence = getFenceOpen(line);
      if (nextFence) {
        fence = nextFence;
      } else if (H2_RE.test(line)) {
        return offset;
      }
    }

    if (nextLineFeed === -1) break;
    offset = nextLineFeed + 1;
  }

  return -1;
};

export const splitMemoMarkdownBody = (source: string): MemoMarkdownSections => {
  const firstContentHeadingOffset = findFirstMemoContentHeadingOffset(source);

  if (firstContentHeadingOffset < 0) {
    const hasBodyIntro = source.trim().length > 0;
    return {
      introMarkdown: hasBodyIntro ? source : '',
      contentMarkdown: hasBodyIntro ? '' : source,
      hasBodyIntro
    };
  }

  const introMarkdown = source.slice(0, firstContentHeadingOffset);
  return {
    introMarkdown,
    contentMarkdown: source.slice(firstContentHeadingOffset),
    hasBodyIntro: introMarkdown.trim().length > 0
  };
};

export const splitMemoRenderedHtml = (
  renderedHtml: string,
  hasBodyIntro: boolean,
  headings: readonly MemoHeading[] = []
): MemoRenderedSections => {
  if (!hasBodyIntro) {
    return {
      introHtml: '',
      contentHtml: renderedHtml
    };
  }

  const firstContentHeading = headings.find((heading) => heading.depth === 2);
  const headingPattern = firstContentHeading
    ? new RegExp(`<h2\\s+[^>]*id=["']${escapeRegExp(firstContentHeading.slug)}["'][^>]*>`, 'i')
    : /<h2(?:\s|>)/i;
  const contentHeadingMatch = headingPattern.exec(renderedHtml);

  if (!contentHeadingMatch) {
    return {
      introHtml: renderedHtml,
      contentHtml: ''
    };
  }

  return {
    introHtml: renderedHtml.slice(0, contentHeadingMatch.index).trim(),
    contentHtml: renderedHtml.slice(contentHeadingMatch.index)
  };
};

export const resolveMemoRenderedSections = ({
  markdownBody,
  renderedHtml,
  headings
}: {
  markdownBody: string;
  renderedHtml: string;
  headings: readonly MemoHeading[];
}): MemoRenderedSections =>
  splitMemoRenderedHtml(
    renderedHtml,
    splitMemoMarkdownBody(markdownBody).hasBodyIntro,
    headings
  );

export const buildMemoTocGroups = (
  headings: readonly Required<MemoHeading>[]
): MemoTocGroup[] => {
  const groups: MemoTocGroup[] = [];
  let current: MemoTocGroup | null = null;

  for (const heading of headings) {
    if (heading.depth === 2) {
      current = { title: heading.text, items: [] };
      groups.push(current);
      continue;
    }

    if (heading.depth === 3 && current) {
      current.items.push({ text: heading.text, slug: heading.slug });
    }
  }

  return groups;
};
