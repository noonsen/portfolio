import { defineMdastPlugin, defineHastPlugin } from 'satteri';
import {
  createFriendNode,
  createFaqNode,
  createSiteInfoNode,
  shouldTransformAboutDirectives,
  transformDirectiveNode,
  ABOUT_DIRECTIVE_ATTR,
  FRIEND_MARKER,
  FAQ_MARKER
} from '../about-directives.mjs';

const CALLOUT_TYPES = new Set(['note', 'tip', 'info', 'warning']);
const NON_CALLOUT_DIRECTIVES = new Set(['friend', 'faq']);

const toOptionalString = (value) => (typeof value === 'string' ? value.trim() : '');

const getMdastText = (ctx, node) => (node ? ctx.textContent(node) : '');

/** Tags directive nodes with hName/hProperties (mdast->hast bridge Sätteri honors, same as mdast-util-to-hast). */
export const satteriDirectivesTagPlugin = ({ aboutEnabled, aboutBase = '/' } = {}) => defineMdastPlugin({
  name: 'astro-whono-satteri-directives-tag',
  containerDirective(node, ctx) {
    if (NON_CALLOUT_DIRECTIVES.has(node.name)) {
      if (!shouldTransformAboutDirectives({ path: ctx.fileURL?.pathname }, { enabled: aboutEnabled })) return undefined;
      const attributes = node.attributes || {};
      ctx.setProperty(node, 'data', {
        hName: 'div',
        hProperties: {
          [ABOUT_DIRECTIVE_ATTR]: node.name,
          ...(node.name === 'friend'
            ? {
                'data-about-name': toOptionalString(attributes.name),
                'data-about-url': toOptionalString(attributes.url),
                'data-about-avatar': toOptionalString(attributes.avatar)
              }
            : { 'data-about-question': toOptionalString(attributes.question) })
        }
      });
      return undefined;
    }

    const type = CALLOUT_TYPES.has(node.name) ? node.name : 'note';
    ctx.setProperty(node, 'data', {
      hName: 'div',
      hProperties: { className: ['callout', type] }
    });

    if (!Array.isArray(node.children) || node.children.length === 0) return undefined;
    const labelIndex = node.children.findIndex(
      (child) => child?.type === 'paragraph' && child?.data?.directiveLabel === true
    );
    if (labelIndex === -1) return undefined;

    const labelNode = node.children[labelIndex];
    const labelText = getMdastText(ctx, labelNode).trim();
    if (!labelText) {
      ctx.removeNode(labelNode);
      return undefined;
    }
    ctx.setProperty(labelNode, 'data', { hName: 'p', hProperties: { className: ['callout-title'] } });
    return undefined;
  },
  leafDirective(node, ctx) {
    if (node.name !== 'contact-links' && node.name !== 'site-info') return undefined;
    if (!shouldTransformAboutDirectives({ path: ctx.fileURL?.pathname }, { enabled: aboutEnabled })) return undefined;

    const attributes = node.attributes || {};
    ctx.setProperty(node, 'data', {
      hName: 'div',
      hProperties: node.name === 'contact-links'
        ? { 'data-about-contact-links': '' }
        : {
            [ABOUT_DIRECTIVE_ATTR]: node.name,
            'data-about-name': toOptionalString(attributes.name),
            'data-about-url': toOptionalString(attributes.url),
            'data-about-description': toOptionalString(attributes.description),
            'data-about-avatar': toOptionalString(attributes.avatar)
          }
    });
    return undefined;
  }
});

const isWhitespaceText = (node) => node?.type === 'text' && !node.value.trim();

const WRAPPER_TAG = { [FRIEND_MARKER]: 'ul', [FAQ_MARKER]: 'div' };
const WRAPPER_CLASS = { [FRIEND_MARKER]: 'friend-list', [FAQ_MARKER]: 'qa-list' };

const findPrecedingWrapper = (parent, index, marker) => {
  let i = index - 1;
  while (i >= 0 && isWhitespaceText(parent.children[i])) i -= 1;
  const sibling = i >= 0 ? parent.children[i] : undefined;
  if (
    sibling?.type === 'element'
    && sibling.tagName === WRAPPER_TAG[marker]
    && sibling.properties?.className?.includes?.(WRAPPER_CLASS[marker])
  ) {
    return sibling;
  }
  return undefined;
};

/** Pass 1: replaces about/faq/friend marker elements with their rendered
 *  cards, each wrapped singly (no merging here — mutations in a Sätteri hast
 *  pass are batched and only visible to the *next* pass, not to later
 *  visits within the same pass, so adjacency can't be resolved live). */
export const satteriDirectivesRenderPlugin = ({ aboutBase = '/' } = {}) => defineHastPlugin({
  name: 'astro-whono-satteri-directives-render',
  element: {
    filter: ['div'],
    visit(node, ctx) {
      const transformed = transformDirectiveNode(node, aboutBase);
      if (!transformed || transformed === node) return undefined;

      const marker = transformed.properties?.[FRIEND_MARKER]
        ? FRIEND_MARKER
        : transformed.properties?.[FAQ_MARKER]
          ? FAQ_MARKER
          : undefined;

      if (!marker) {
        ctx.replaceNode(node, transformed);
        return undefined;
      }

      delete transformed.properties[marker];
      const wrapperNode = marker === FRIEND_MARKER
        ? { type: 'element', tagName: 'ul', properties: { className: ['friend-list'] }, children: [transformed] }
        : { type: 'element', tagName: 'div', properties: { className: ['qa-list'], 'aria-label': 'FAQ' }, children: [transformed] };

      ctx.replaceNode(node, wrapperNode);
      return undefined;
    }
  }
});

/** Pass 2 (register after satteriDirectivesRenderPlugin): merges consecutive
 *  friend-list/qa-list wrappers produced by pass 1 into one, ported from
 *  about-directives.mjs's groupDirectiveRuns.
 *
 *  A run of 3+ adjacent wrappers can't just merge pairwise into "whatever
 *  precedes me" — patches are batched, so by the time a third wrapper reads
 *  its "preceding sibling" it may see the second one, which was already
 *  targeted by a removeNode patch from merging *it* into the first; a
 *  patch whose target was removed earlier in the same pass is dropped,
 *  silently losing that wrapper's children. `mergeTargets` redirects every
 *  merge to the run's original (never-removed) anchor wrapper instead. */
export const satteriDirectivesGroupPlugin = () => {
  const mergeTargets = new WeakMap();
  const resolveAnchor = (node) => {
    let current = node;
    while (mergeTargets.has(current)) current = mergeTargets.get(current);
    return current;
  };

  return defineHastPlugin({
    name: 'astro-whono-satteri-directives-group',
    element: {
      filter: ['ul', 'div'],
      visit(node, ctx) {
        const marker = node.tagName === 'ul' && node.properties?.className?.includes?.('friend-list')
          ? FRIEND_MARKER
          : node.tagName === 'div' && node.properties?.className?.includes?.('qa-list')
            ? FAQ_MARKER
            : undefined;
        if (!marker) return undefined;

        const parent = ctx.parent(node);
        const index = ctx.indexOf(node);
        if (!parent || index === undefined) return undefined;

        const wrapper = findPrecedingWrapper(parent, index, marker);
        if (!wrapper) return undefined;

        const anchor = resolveAnchor(wrapper);
        for (const child of [...node.children]) {
          ctx.appendChild(anchor, child);
        }
        ctx.removeNode(node);
        mergeTargets.set(node, anchor);
        return undefined;
      }
    }
  });
};
