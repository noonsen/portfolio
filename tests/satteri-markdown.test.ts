import { pathToFileURL } from 'node:url';
import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { describe, expect, it } from 'vitest';
import { satteriMathPlugin } from '../src/plugins/satteri/math.mjs';
import {
  satteriDirectivesTagPlugin,
  satteriDirectivesRenderPlugin,
  satteriDirectivesGroupPlugin
} from '../src/plugins/satteri/directives.mjs';
import { satteriSanitizePlugin } from '../src/plugins/satteri/sanitize.mjs';

const ABOUT_URL = pathToFileURL('src/content/about/index.md');
const OTHER_URL = pathToFileURL('src/content/essay/some-post.md');

const renderMarkdown = async (source: string, { fileURL }: { fileURL?: URL } = {}) => {
  const renderer = await createSatteriMarkdownProcessor({
    features: {
      math: { singleDollarTextMath: false },
      directive: true,
      smartPunctuation: true
    },
    mdastPlugins: [satteriMathPlugin(), satteriDirectivesTagPlugin({ aboutBase: '/' })],
    hastPlugins: [
      satteriDirectivesRenderPlugin({ aboutBase: '/' }),
      satteriDirectivesGroupPlugin(),
      satteriSanitizePlugin()
    ]
  });
  const result = await renderer.render(source, fileURL ? { fileURL } : {});
  return result.code;
};

describe('satteri math plugin', () => {
  it('renders double-dollar math through KaTeX with no boundary-marker wrapper', async () => {
    const html = await renderMarkdown(['$$', 'x + y', '$$'].join('\n'));

    expect(html).toContain('class="katex"');
    expect(html).toContain('class="katex-display"');
    expect(html).not.toContain('math-inline');
    expect(html).not.toContain('math-display');
  });

  it('leaves single-dollar math as literal text (singleDollarTextMath: false)', async () => {
    const html = await renderMarkdown('Inline $x + y$ text.');

    expect(html).not.toContain('class="katex"');
    expect(html).toContain('$x + y$');
  });
});

describe('satteri callout directive', () => {
  it.each(['note', 'tip', 'info', 'warning'])('renders a %s callout', async (type) => {
    const html = await renderMarkdown([`:::${type}`, 'body text', ':::'].join('\n'));

    expect(html).toContain(`class="callout ${type}"`);
    expect(html).toContain('body text');
  });

  it('downgrades an unknown directive type to note', async () => {
    const html = await renderMarkdown([':::mystery', 'body text', ':::'].join('\n'));

    expect(html).toContain('class="callout note"');
  });

  it('renders a bracketed label as the callout title', async () => {
    const html = await renderMarkdown([':::note[Heads up]', 'body text', ':::'].join('\n'));

    expect(html).toContain('class="callout-title"');
    expect(html).toContain('Heads up');
  });
});

describe('satteri sanitize plugin', () => {
  it('strips <script> tags entirely', async () => {
    const html = await renderMarkdown("Before\n\n<script>alert('xss')</script>\n\nAfter");

    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert(');
    expect(html).toContain('Before');
    expect(html).toContain('After');
  });

  it('does not let raw HTML with fake math classes trigger KaTeX', async () => {
    const html = await renderMarkdown('<span class="math-inline">x + y</span>');

    expect(html).not.toContain('class="katex"');
    expect(html).toContain('x + y');
  });

  it('strips unsafe href protocols but keeps safe ones', async () => {
    const html = await renderMarkdown(
      ['[unsafe](javascript:alert(1))', '', '[safe](https://example.com)'].join('\n')
    );

    expect(html).not.toContain('javascript:');
    expect(html).toContain('href="https://example.com"');
  });

  it('drops attributes not on the schema allowlist', async () => {
    const html = await renderMarkdown('<div onclick="alert(1)">hi</div>');

    expect(html).not.toContain('onclick');
    expect(html).toContain('hi');
  });

  it('keeps raw HTML at multiple nesting depths in the same document', async () => {
    const html = await renderMarkdown(
      [
        '<figure class="figure"><img src="/a.webp" alt="A" /><figcaption>First</figcaption></figure>',
        '',
        '<ul class="gallery">',
        '  <li><figure><img src="/b.webp" alt="B" /><figcaption>Second</figcaption></figure></li>',
        '  <li><figure><img src="/c.webp" alt="C" /><figcaption>Third</figcaption></figure></li>',
        '</ul>'
      ].join('\n')
    );

    expect(html.match(/<figure/g)).toHaveLength(3);
    expect(html).toContain('First');
    expect(html).toContain('Second');
    expect(html).toContain('Third');
    expect(html).toContain('src="/a.webp"');
    expect(html).toContain('src="/b.webp"');
    expect(html).toContain('src="/c.webp"');
  });
});

describe('satteri about-directives', () => {
  const aboutSource = [
    ':::friend{name="Astro" url="https://astro.build/" avatar=""}',
    'Frontend framework',
    ':::',
    '',
    ':::friend{name="Whono" url="https://github.com/cxro/astro-whono" avatar=""}',
    'Theme',
    ':::',
    '',
    ':::faq{question="First question?"}',
    'First answer.',
    ':::',
    '',
    ':::faq{question="Second question?"}',
    'Second answer.',
    ':::',
    '',
    '::contact-links'
  ].join('\n');

  it('is gated off outside the about collection source path', async () => {
    const html = await renderMarkdown(aboutSource, { fileURL: OTHER_URL });

    expect(html).not.toContain('friend-card');
    expect(html).not.toContain('qa-item');
  });

  it('renders and groups consecutive friend cards into one list', async () => {
    const html = await renderMarkdown(aboutSource, { fileURL: ABOUT_URL });

    expect(html.match(/<ul class="friend-list"/g)).toHaveLength(1);
    expect(html.match(/friend-card__name/g)).toHaveLength(2);
    expect(html).toContain('Astro');
    expect(html).toContain('Whono');
  });

  it('renders and groups consecutive FAQ items into one list', async () => {
    const html = await renderMarkdown(aboutSource, { fileURL: ABOUT_URL });

    expect(html.match(/<div class="qa-list"/g)).toHaveLength(1);
    expect(html.match(/class="qa-item"/g)).toHaveLength(2);
    expect(html).toContain('First question?');
    expect(html).toContain('Second question?');
  });

  it('renders the contact-links placeholder', async () => {
    const html = await renderMarkdown(aboutSource, { fileURL: ABOUT_URL });

    expect(html).toContain('data-about-contact-links');
  });

  it('rejects an unsafe friend URL', async () => {
    const html = await renderMarkdown(
      [':::friend{name="Bad" url="javascript:alert(1)" avatar=""}', 'x', ':::'].join('\n'),
      { fileURL: ABOUT_URL }
    );

    expect(html).not.toContain('friend-card');
  });
});
