export const MARKDOWN_HIGHLIGHT_THEME_IDS = [
  'github',
  'nord',
  'onedark',
  'classic',
  'vivid'
] as const;

export type MarkdownHighlightTheme = (typeof MARKDOWN_HIGHLIGHT_THEME_IDS)[number];

export type MarkdownHighlightThemeOption = {
  id: MarkdownHighlightTheme;
  label: string;
  description: string;
};

export const DEFAULT_MARKDOWN_HIGHLIGHT_THEME: MarkdownHighlightTheme = 'github';

// Preset registry only. CodeMirror tag-to-token mapping lives in
// editor-markdown-highlight-extension.ts; palette variables live in pane-content.css.
export const MARKDOWN_HIGHLIGHT_THEME_OPTIONS: readonly MarkdownHighlightThemeOption[] = [
  {
    id: 'github',
    label: 'GitHub',
    description: 'Default'
  },
  {
    id: 'nord',
    label: 'Nord',
    description: 'Polar'
  },
  {
    id: 'onedark',
    label: 'One Dark',
    description: 'Dusk'
  },
  {
    id: 'classic',
    label: 'Classic',
    description: 'Plain'
  },
  {
    id: 'vivid',
    label: 'Vivid',
    description: 'Neon'
  }
] as const;

const MARKDOWN_HIGHLIGHT_THEME_SET = new Set<unknown>(MARKDOWN_HIGHLIGHT_THEME_IDS);
const LEGACY_MARKDOWN_HIGHLIGHT_THEME_MAP: Partial<Record<string, MarkdownHighlightTheme>> = {
  subtle: 'github',
  structured: 'nord'
};

export const isMarkdownHighlightTheme = (value: unknown): value is MarkdownHighlightTheme =>
  MARKDOWN_HIGHLIGHT_THEME_SET.has(value);

export const resolveMarkdownHighlightTheme = (value: unknown): MarkdownHighlightTheme => {
  if (isMarkdownHighlightTheme(value)) return value;
  if (typeof value === 'string') {
    return LEGACY_MARKDOWN_HIGHLIGHT_THEME_MAP[value] ?? DEFAULT_MARKDOWN_HIGHLIGHT_THEME;
  }
  return DEFAULT_MARKDOWN_HIGHLIGHT_THEME;
};

export const getMarkdownHighlightThemeLabel = (theme: MarkdownHighlightTheme): string =>
  MARKDOWN_HIGHLIGHT_THEME_OPTIONS.find((option) => option.id === theme)?.label ?? theme;
