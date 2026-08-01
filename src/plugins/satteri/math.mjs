import { defineMdastPlugin } from 'satteri';
import katex from 'katex';

const renderMath = (value, displayMode) => {
  try {
    return katex.renderToString(value, { displayMode, throwOnError: false, output: 'html' });
  } catch {
    return null;
  }
};

// No custom wrapper: KaTeX's own displayMode output already wraps itself in
// <span class="katex-display">. A wrapper using `math-display`/`math-inline`
// (the original pipeline's remark-math/rehype-katex trust-boundary marker
// classes) would let user-authored raw HTML spoof trusted math output.
export const satteriMathPlugin = () => defineMdastPlugin({
  name: 'astro-whono-satteri-math',
  math(node) {
    const html = renderMath(node.value, true);
    if (html === null) return undefined;
    return { rawHtml: html };
  },
  inlineMath(node) {
    const html = renderMath(node.value, false);
    if (html === null) return undefined;
    return { rawHtml: html };
  }
});
