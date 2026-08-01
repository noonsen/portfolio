import type { MarkdownInsertPlacement, MarkdownToolId } from './markdown-tools';

const MARKDOWN_MORE_SEPARATOR_TEXT = '<!-- more -->';

export type MarkdownMathInsertTool = {
  type: 'math';
  id: Extract<MarkdownToolId, 'inlineMath' | 'blockMath'>;
  label: string;
  icon: 'sigma' | 'square-sigma';
};

export type MarkdownDetailsInsertTool = {
  type: 'details';
  id: Extract<MarkdownToolId, 'details'>;
  label: string;
  icon: 'list-collapse';
  text: string;
  placement: Extract<MarkdownInsertPlacement, 'block'>;
};

export type MarkdownMoreSeparatorInsertTool = {
  type: 'moreSeparator';
  label: string;
  icon: 'separator-horizontal';
  text: string;
  placement: Extract<MarkdownInsertPlacement, 'block'>;
};

export type MarkdownAboutDirectiveInsertTool = {
  type: 'aboutDirective';
  id: 'friend' | 'faq' | 'siteInfo' | 'contactLinks';
  label: string;
  icon: 'square-user-round' | 'badge-question-mark' | 'info' | 'link-2';
  text: string;
  placement: Extract<MarkdownInsertPlacement, 'block'>;
};

export const MARKDOWN_DETAILS_SUMMARY_PLACEHOLDER = 'Title';
export const MARKDOWN_DETAILS_BODY_PLACEHOLDER = 'Content';

export const buildMarkdownDetailsText = (
  body: string = MARKDOWN_DETAILS_BODY_PLACEHOLDER
): string =>
  [
    '<details>',
    `<summary>${MARKDOWN_DETAILS_SUMMARY_PLACEHOLDER}</summary>`,
    '',
    body,
    '</details>'
  ].join('\n');

export const MARKDOWN_MATH_INSERT_TOOLS: readonly MarkdownMathInsertTool[] = [
  { type: 'math', id: 'inlineMath', label: 'Inline formula', icon: 'sigma' },
  { type: 'math', id: 'blockMath', label: 'Block formula', icon: 'square-sigma' }
] as const;

export const MARKDOWN_DETAILS_INSERT_TOOL: MarkdownDetailsInsertTool = {
  type: 'details',
  id: 'details',
  label: 'Collapsible content',
  icon: 'list-collapse',
  text: buildMarkdownDetailsText(),
  placement: 'block'
};

export const MARKDOWN_MORE_SEPARATOR_INSERT_TOOL: MarkdownMoreSeparatorInsertTool = {
  type: 'moreSeparator',
  label: 'Excerpt separator',
  icon: 'separator-horizontal',
  text: MARKDOWN_MORE_SEPARATOR_TEXT,
  placement: 'block'
};

export const MARKDOWN_ABOUT_DIRECTIVE_INSERT_TOOLS: readonly MarkdownAboutDirectiveInsertTool[] = [
  {
    type: 'aboutDirective',
    id: 'friend',
    label: 'Insert friend link',
    icon: 'square-user-round',
    text: [
      ':::friend{name="Site name" url="https://example.com" avatar="https://example.com/avatar.png"}',
      'A short introduction',
      ':::'
    ].join('\n'),
    placement: 'block'
  },
  {
    type: 'aboutDirective',
    id: 'faq',
    label: 'Insert Q&A',
    icon: 'badge-question-mark',
    text: [
      ':::faq{question="Question title"}',
      'Answer content',
      ':::'
    ].join('\n'),
    placement: 'block'
  },
  {
    type: 'aboutDirective',
    id: 'siteInfo',
    label: 'Insert site info',
    icon: 'info',
    text: '::site-info{name="Site name" url="https://example.com" description="A short introduction" avatar="https://example.com/avatar.png"}',
    placement: 'block'
  },
  {
    type: 'aboutDirective',
    id: 'contactLinks',
    label: 'Insert contact links',
    icon: 'link-2',
    text: '::contact-links',
    placement: 'block'
  }
] as const;
