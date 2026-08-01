import { defineHastPlugin } from 'satteri';
import { raw as parseRawHtml } from 'hast-util-raw';
import { sanitize } from 'hast-util-sanitize';
import { sanitizeSchema } from '../sanitize-schema.mjs';

const SAFE_URL_PROTOCOLS = new Set(['http', 'https', 'mailto', 'tel']);
const URL_ATTRS = new Set(['href', 'src']);

const isSafeUrl = (value) => {
  if (typeof value !== 'string') return true;
  const trimmed = value.trim();
  if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith('/') || trimmed.startsWith('.')) return true;
  const match = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(trimmed);
  if (!match) return true;
  return SAFE_URL_PROTOCOLS.has(match[1].toLowerCase());
};

const allowedTagNames = new Set(sanitizeSchema.tagNames ?? []);
const RAW_SANITIZED_DATA_KEY = '__satteriRawSanitized';

// Sätteri's filtered `element` visitor dispatches only nodes whose tagName is
// in `filter` — there is no wildcard, so every known HTML tag name must be
// listed explicitly or it silently bypasses this plugin entirely (verified:
// an empty filter does NOT mean "match all" for filtered visitors, unlike
// the bare-function case for unfiltered node types). This is the full
// WHATWG HTML element vocabulary plus the schema's extra tags, so both
// allowed and disallowed (e.g. `script`, `iframe`) tags are always visited.
const ALL_KNOWN_HTML_TAGS = [
  'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base',
  'bdi', 'bdo', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption',
  'cite', 'code', 'col', 'colgroup', 'data', 'datalist', 'dd', 'del',
  'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em', 'embed', 'fieldset',
  'figcaption', 'figure', 'footer', 'form', 'frame', 'frameset', 'h1', 'h2',
  'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i',
  'iframe', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'link',
  'main', 'map', 'mark', 'menu', 'meta', 'meter', 'nav', 'noscript',
  'object', 'ol', 'optgroup', 'option', 'output', 'p', 'param', 'picture',
  'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'script',
  'section', 'select', 'slot', 'small', 'source', 'span', 'strong', 'style',
  'sub', 'summary', 'sup', 'svg', 'table', 'tbody', 'td', 'template',
  'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track', 'u',
  'ul', 'var', 'video', 'wbr', 'path', 'rect', 'circle', 'line', 'polygon',
  'polyline', 'ellipse', 'g', 'defs', 'use', 'marquee', 'blink', 'xmp',
  'plaintext', 'applet', 'basefont', 'bgsound', 'noembed', 'noframes'
];
const elementFilter = Array.from(new Set([...ALL_KNOWN_HTML_TAGS, ...allowedTagNames]));

const buildAttrAllowlist = (tagName) => {
  const rules = new Map();
  const addRules = (list) => {
    for (const entry of list ?? []) {
      if (Array.isArray(entry)) {
        const [name, ...values] = entry;
        rules.set(name, values.length > 0 ? new Set(values) : true);
      } else {
        rules.set(entry, true);
      }
    }
  };
  addRules(sanitizeSchema.attributes?.['*']);
  addRules(sanitizeSchema.attributes?.[tagName]);
  return rules;
};

const attrAllowlistCache = new Map();
const getAttrAllowlist = (tagName) => {
  let rules = attrAllowlistCache.get(tagName);
  if (!rules) {
    rules = buildAttrAllowlist(tagName);
    attrAllowlistCache.set(tagName, rules);
  }
  return rules;
};

/**
 * Reduced port of hast-util-sanitize's schema semantics (tag allowlist,
 * per-attribute value allowlist, basic href/src protocol check) — Sätteri's
 * hast visitor has no whole-tree hook, so this walks per-element instead.
 */
export const satteriSanitizePlugin = () => defineHastPlugin({
  name: 'astro-whono-satteri-sanitize',
  element: {
    filter: elementFilter,
    visit(node, ctx) {
      if (!allowedTagNames.has(node.tagName)) {
        ctx.removeNode(node);
        return;
      }
      const allowlist = getAttrAllowlist(node.tagName);
      const properties = node.properties ?? {};
      for (const key of Object.keys(properties)) {
        const rule = allowlist.get(key);
        if (rule === undefined) {
          ctx.setProperty(node, key, undefined);
          continue;
        }
        const value = properties[key];
        if (rule instanceof Set && typeof value === 'string' && !rule.has(value)) {
          ctx.setProperty(node, key, undefined);
          continue;
        }
        if (URL_ATTRS.has(key) && !isSafeUrl(value)) {
          ctx.setProperty(node, key, undefined);
        }
      }
    }
  },
  // Embedded raw HTML (both user-authored and this pipeline's own KaTeX
  // output — see satteri/math.mjs) stays an opaque, unparsed `raw` node
  // through the hast pass; it never reaches the `element` visitor above.
  // Inline raw HTML also arrives fragmented — an opening tag, its text, and
  // its closing tag are separate sibling `raw`/text nodes, not one balanced
  // node — so parsing one node in isolation reconstructs a broken, unclosed
  // element. A document can have raw fragments at multiple nesting depths
  // (e.g. a gallery's <ul><li><figure> siblings), so reconstructing only the
  // *immediate* parent orphans deeper ones — the fresh subtree it splices in
  // has no arena id, so once the outer parent is replaced, any raw node
  // still pending inside the old subtree targets content that's already
  // gone, and its patch is dropped (silently losing that content). Instead,
  // walk up to the true document root and reconstruct the whole tree in one
  // hast-util-raw + hast-util-sanitize pass exactly once per compile —
  // ctx.data is the correct one-shot guard here, since it's shared across
  // every plugin and node visit for the whole compile (unlike a per-node
  // WeakSet, which can't tell "already covered as part of a wider
  // reconstruction" from "never touched").
  raw(node, ctx) {
    if (ctx.data[RAW_SANITIZED_DATA_KEY]) return;
    ctx.data[RAW_SANITIZED_DATA_KEY] = true;

    let root = node;
    for (let parent = ctx.parent(root); parent; parent = ctx.parent(root)) {
      root = parent;
    }

    const wrapped = { type: 'root', children: [...root.children] };
    const parsed = parseRawHtml(wrapped);
    const sanitized = sanitize(parsed, sanitizeSchema);
    ctx.setProperty(root, 'children', sanitized.children ?? []);
  }
});
