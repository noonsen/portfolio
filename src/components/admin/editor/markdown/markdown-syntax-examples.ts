export type MarkdownSyntaxIcon =
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'quote'
  | 'link'
  | 'image'
  | 'code'
  | 'code-block'
  | 'list'
  | 'ordered-list'
  | 'task-list'
  | 'table'
  | 'message-square-text'
  | 'sigma'
  | 'square-sigma'
  | 'smile'
  | 'minus';

export type MarkdownSyntaxExample = {
  label: string;
  syntax: string;
  icon?: MarkdownSyntaxIcon;
  marker?: string;
};

export type MarkdownShortcutExample = {
  label: string;
  shortcut: string;
  icon?: MarkdownSyntaxIcon;
};

export const MARKDOWN_SYNTAX_EXAMPLES: readonly MarkdownSyntaxExample[] = [
  { label: 'Section heading', marker: 'H2', syntax: '## Heading' },
  { label: 'Level 3 heading', marker: 'H3', syntax: '### Heading' },
  { label: 'Bold', icon: 'bold', syntax: '**bold text**' },
  { label: 'Italic', icon: 'italic', syntax: '*italic text*' },
  { label: 'Strikethrough', icon: 'strikethrough', syntax: '~~text~~' },
  { label: 'Link', icon: 'link', syntax: '[link text](url)' },
  { label: 'Image', icon: 'image', syntax: '![alt](url "image description")' },
  { label: 'Quote', icon: 'quote', syntax: '> quoted text' },
  { label: 'Callout', icon: 'message-square-text', syntax: ':::note[title]' },
  { label: 'Inline formula', icon: 'sigma', syntax: '$$x$$' },
  { label: 'Block formula', icon: 'square-sigma', syntax: '$$\nx\n$$' },
  { label: 'Emoji', icon: 'smile', syntax: '🙂' },
  { label: 'Code', icon: 'code', syntax: '`code`' },
  { label: 'Code block', icon: 'code-block', syntax: '```language' },
  { label: 'Bulleted list', icon: 'list', syntax: '- item' },
  { label: 'Numbered list', icon: 'ordered-list', syntax: '1. item' },
  { label: 'Task list', icon: 'task-list', syntax: '- [ ] to-do item' },
  { label: 'Table', icon: 'table', syntax: '| header | header |' },
  { label: 'Divider', icon: 'minus', syntax: '---' }
] as const;

export const MARKDOWN_SHORTCUT_EXAMPLES: readonly MarkdownShortcutExample[] = [
  { label: 'Bold', icon: 'bold', shortcut: 'Ctrl + B' },
  { label: 'Italic', icon: 'italic', shortcut: 'Ctrl + I' },
  { label: 'Link', icon: 'link', shortcut: 'Ctrl + K' }
] as const;
