import type {
  EditableThemeSettings,
  HeroPresetId,
  HomeIntroLinkKey,
  PageId,
  SidebarDividerVariant,
  SidebarNavId,
  SiteSocialIconKey,
  SiteSocialPresetId,
  SiteSocialPresetOrder,
  ThemeSettingsFileGroup,
  TypographySettings
} from '../theme-settings';
import {
  THEME_TYPOGRAPHY_DEFAULT,
  asThemeFontIdForRole,
  getThemeFontOptionsForRole,
  isThemeFontIdForRole
} from '../fonts/registry';
import {
  getBitsAvatarLocalFilePath as getAdminBitsAvatarLocalFilePath,
  getHeroImageLocalFilePath as getAdminHeroImageLocalFilePath,
  normalizeBitsAvatarPath as normalizeAdminBitsAvatarPath,
  normalizeHeroImageSrc as normalizeAdminHeroImageSrc
} from '../../utils/format';

export {
  getAdminBitsAvatarLocalFilePath,
  getAdminHeroImageLocalFilePath,
  normalizeAdminBitsAvatarPath,
  normalizeAdminHeroImageSrc
};

export const ADMIN_NAV_IDS = ['essay', 'bits', 'memo', 'archive', 'about', 'portfolio'] as const satisfies readonly SidebarNavId[];
export const ADMIN_PAGE_IDS = ['essay', 'archive', 'bits', 'memo', 'about'] as const satisfies readonly PageId[];
export const ADMIN_SOCIAL_CUSTOM_LIMIT = 8;

export const ADMIN_HERO_PRESETS = ['default', 'none'] as const satisfies readonly HeroPresetId[];
export const ADMIN_HERO_PRESET_SET: ReadonlySet<HeroPresetId> = new Set(ADMIN_HERO_PRESETS);
export const ADMIN_HERO_IMAGE_ALT_DEFAULT = 'Whono theme preview';
export const ADMIN_HERO_IMAGE_ALT_MAX_LENGTH = 120;

export const ADMIN_ARTICLE_META_DATE_LABEL_DEFAULT = 'Published on: ';
export const ADMIN_ARTICLE_META_DATE_LABEL_MAX_LENGTH = 20;

export const ADMIN_SIDEBAR_DIVIDER_VARIANTS = [
  'default',
  'subtle',
  'none'
] as const satisfies readonly SidebarDividerVariant[];
export const ADMIN_SIDEBAR_DIVIDER_DEFAULT: SidebarDividerVariant = 'default';
export const ADMIN_SIDEBAR_DIVIDER_SET: ReadonlySet<SidebarDividerVariant> = new Set(ADMIN_SIDEBAR_DIVIDER_VARIANTS);
export const ADMIN_SIDEBAR_DIVIDER_OPTIONS = [
  { id: 'default', label: 'Default' },
  { id: 'subtle', label: 'Subtle' },
  { id: 'none', label: 'Hidden' }
] as const satisfies readonly {
  id: SidebarDividerVariant;
  label: string;
}[];

export const ADMIN_TYPOGRAPHY_DEFAULT: TypographySettings = THEME_TYPOGRAPHY_DEFAULT;
export const getAdminTypographyFontOptions = getThemeFontOptionsForRole;
export const isAdminTypographyFontId = isThemeFontIdForRole;

export const ADMIN_HOME_INTRO_LINK_KEYS = [
  'archive',
  'essay',
  'bits',
  'memo',
  'about',
  'tag'
] as const satisfies readonly HomeIntroLinkKey[];
export const ADMIN_HOME_INTRO_LINK_DEFAULT = ['archive', 'essay'] as const satisfies readonly HomeIntroLinkKey[];
export const ADMIN_HOME_INTRO_LINK_LIMIT = 2;
export const ADMIN_HOME_INTRO_LINK_KEY_SET: ReadonlySet<HomeIntroLinkKey> = new Set(ADMIN_HOME_INTRO_LINK_KEYS);
export const ADMIN_HOME_INTRO_LINK_OPTIONS = [
  { id: 'archive', label: 'Archive', href: '/archive/' },
  { id: 'essay', label: 'Essays', href: '/essay/' },
  { id: 'bits', label: 'Musings', href: '/bits/' },
  { id: 'memo', label: 'Notes', href: '/memo/' },
  { id: 'about', label: 'About', href: '/about/' },
  { id: 'tag', label: '#Tags', href: '/archive/?picker=tag' }
] as const satisfies readonly {
  id: HomeIntroLinkKey;
  label: string;
  href: string;
}[];

export const ADMIN_SOCIAL_PRESET_IDS = ['github', 'x', 'email'] as const satisfies readonly SiteSocialPresetId[];
export const ADMIN_SOCIAL_PRESET_ORDER_DEFAULT: Record<SiteSocialPresetId, number> = {
  github: 1,
  x: 2,
  email: 3
};
export const ADMIN_SOCIAL_ORDER_MIN = 1;
export const ADMIN_SOCIAL_ORDER_MAX = ADMIN_SOCIAL_PRESET_IDS.length + ADMIN_SOCIAL_CUSTOM_LIMIT;
export const ADMIN_NAV_ORDER_MIN = 1;
export const ADMIN_NAV_ORDER_MAX = 999;

type AdminSocialOrderScope = 'preset' | 'custom';
type AdminSocialOrderInput = {
  key: string;
  order: number;
};
type AdminNavOrderInput = {
  key: SidebarNavId;
  order: number;
};

export type AdminSocialOrderIssue = {
  type: 'range' | 'duplicate';
  scope: AdminSocialOrderScope;
  key: string;
  order: number;
};
export type AdminNavOrderIssue = {
  type: 'range' | 'duplicate';
  key: SidebarNavId;
  order: number;
};

export const ADMIN_SOCIAL_ICON_KEYS = [
  'github',
  'x',
  'email',
  'weibo',
  'facebook',
  'instagram',
  'telegram',
  'mastodon',
  'bilibili',
  'youtube',
  'linkedin',
  'website'
] as const satisfies readonly SiteSocialIconKey[];
export const ADMIN_SOCIAL_ICON_KEY_SET: ReadonlySet<SiteSocialIconKey> = new Set(ADMIN_SOCIAL_ICON_KEYS);

export const ADMIN_GITHUB_HOSTS = ['github.com'] as const;
export const ADMIN_X_HOSTS = ['x.com', 'twitter.com'] as const;

export const ADMIN_HOME_INTRO_MAX_LENGTH = 240;
export const ADMIN_PAGE_TITLE_MAX_LENGTH = 60;
export const ADMIN_PAGE_SUBTITLE_MAX_LENGTH = 120;
export const ADMIN_NAV_ORNAMENT_DEFAULT = '·';
export const ADMIN_NAV_ORNAMENT_MAX_LENGTH = 4;
export const ADMIN_FOOTER_START_YEAR_MIN = 1900;
export const ADMIN_FOOTER_COPYRIGHT_MAX_LENGTH = 120;
export const ADMIN_OVERVIEW_HIDDEN_MESSAGE_DEFAULT = 'The author has not made this page public yet.';
export const ADMIN_OVERVIEW_HIDDEN_MESSAGE_MAX_LENGTH = 120;

export const ADMIN_LOCALE_RE = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
export const ADMIN_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const getAdminFooterStartYearMax = (): number => new Date().getFullYear();

export const isAdminNavId = (value: string): value is SidebarNavId =>
  (ADMIN_NAV_IDS as readonly string[]).includes(value);

export const isAdminHeroPresetId = (value: string): value is HeroPresetId =>
  ADMIN_HERO_PRESET_SET.has(value as HeroPresetId);

export const isAdminSidebarDividerVariant = (value: string): value is SidebarDividerVariant =>
  ADMIN_SIDEBAR_DIVIDER_SET.has(value as SidebarDividerVariant);

export const isAdminHomeIntroLinkKey = (value: string): value is HomeIntroLinkKey =>
  ADMIN_HOME_INTRO_LINK_KEY_SET.has(value as HomeIntroLinkKey);

export const isAdminSocialPresetId = (value: string): value is SiteSocialPresetId =>
  (ADMIN_SOCIAL_PRESET_IDS as readonly string[]).includes(value);

export const normalizeAdminSocialIconKey = (value: unknown): SiteSocialIconKey | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (normalized === 'link' || normalized === 'globe') return 'website';
  return ADMIN_SOCIAL_ICON_KEY_SET.has(normalized as SiteSocialIconKey) ? (normalized as SiteSocialIconKey) : undefined;
};

export const isAdminSocialIconKey = (value: string): value is SiteSocialIconKey =>
  ADMIN_SOCIAL_ICON_KEY_SET.has(value as SiteSocialIconKey);

export const isAdminSocialOrderValue = (value: number): boolean =>
  Number.isInteger(value) && value >= ADMIN_SOCIAL_ORDER_MIN && value <= ADMIN_SOCIAL_ORDER_MAX;

export const isAdminNavOrderValue = (value: number): boolean =>
  Number.isInteger(value) && value >= ADMIN_NAV_ORDER_MIN && value <= ADMIN_NAV_ORDER_MAX;

export const getAdminSocialOrderIssues = (
  presetOrder: Readonly<SiteSocialPresetOrder>,
  customItems: readonly AdminSocialOrderInput[]
): AdminSocialOrderIssue[] => {
  const entries = [
    ...ADMIN_SOCIAL_PRESET_IDS.map((id) => ({
      scope: 'preset' as const,
      key: id,
      order: presetOrder[id]
    })),
    ...customItems.map((item) => ({
      scope: 'custom' as const,
      key: item.key,
      order: item.order
    }))
  ];
  const orderCounts = new Map<number, number>();

  entries.forEach((entry) => {
    if (!isAdminSocialOrderValue(entry.order)) return;
    orderCounts.set(entry.order, (orderCounts.get(entry.order) ?? 0) + 1);
  });

  const issues: AdminSocialOrderIssue[] = [];

  entries.forEach((entry) => {
    if (!isAdminSocialOrderValue(entry.order)) {
      issues.push({ type: 'range', ...entry });
      return;
    }

    if ((orderCounts.get(entry.order) ?? 0) > 1) {
      issues.push({ type: 'duplicate', ...entry });
    }
  });

  return issues;
};

export const getAdminNavOrderIssues = (items: readonly AdminNavOrderInput[]): AdminNavOrderIssue[] => {
  const orderCounts = new Map<number, number>();

  items.forEach((item) => {
    if (!isAdminNavOrderValue(item.order)) return;
    orderCounts.set(item.order, (orderCounts.get(item.order) ?? 0) + 1);
  });

  const issues: AdminNavOrderIssue[] = [];

  items.forEach((item) => {
    if (!isAdminNavOrderValue(item.order)) {
      issues.push({ type: 'range', ...item });
      return;
    }

    if ((orderCounts.get(item.order) ?? 0) > 1) {
      issues.push({ type: 'duplicate', ...item });
    }
  });

  return issues;
};

export const getAdminHomeIntroLinkOption = (
  id: HomeIntroLinkKey
): (typeof ADMIN_HOME_INTRO_LINK_OPTIONS)[number] =>
  ADMIN_HOME_INTRO_LINK_OPTIONS.find((option) => option.id === id) ?? ADMIN_HOME_INTRO_LINK_OPTIONS[0];

export const isAdminAllowedHttpsUrl = (value: string, allowedHosts?: readonly string[]): boolean => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') return false;
    if (!Array.isArray(allowedHosts) || !allowedHosts.length) return true;

    const hostname = parsed.hostname.toLowerCase();
    return allowedHosts.some((host) => hostname === host || hostname === `www.${host}` || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
};

export type AdminThemeSettingsValidationIssue = {
  path: string;
  message: string;
};

export type AdminThemeSettingsMismatchMode = 'exact' | 'subset';
export type AdminThemeSettingsChangeKind = 'added' | 'removed' | 'updated';

export type AdminThemeSettingsChangePreview = {
  path: string;
  kind: AdminThemeSettingsChangeKind;
  before: string;
  after: string;
};

export type AdminWritableThemeSettingsGroups = {
  site: EditableThemeSettings['site'];
  shell: EditableThemeSettings['shell'];
  home: EditableThemeSettings['home'];
  page: EditableThemeSettings['page'];
  ui: EditableThemeSettings['ui'];
};

type LooseRecord = Record<string, unknown>;

type AdminThemeSettingsCanonicalizeOptions = {
  footerStartYearMax?: number;
  defaultCustomSocialIconKey?: SiteSocialIconKey;
  normalizeCustomSocialLabel?: (value: unknown, iconKey: SiteSocialIconKey) => string;
};

type AdminThemeSettingsValidateOptions = {
  footerStartYearMax?: number;
  localFileExists?: (relativePath: string) => boolean;
};

const isRecord = (value: unknown): value is LooseRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeMultiline = (value: string): string => value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

const normalizeTrimmed = (value: unknown): string => String(value ?? '').trim();

const normalizeOptionalSingleLine = (value: string): string | null => {
  const normalized = normalizeMultiline(value).trim();
  return normalized ? normalized : null;
};

const normalizeSingleLine = (value: unknown, fallback = ''): string => {
  const normalized = normalizeMultiline(String(value ?? '')).trim();
  return normalized || fallback;
};

const normalizeNavOrnament = (value: unknown): string | null => {
  if (value === null) return null;
  if (typeof value !== 'string') return ADMIN_NAV_ORNAMENT_DEFAULT;
  const normalized = normalizeMultiline(value).trim();
  return normalized || null;
};

const normalizeEmail = (value: string): string => value.replace(/^mailto:/i, '').trim();

const parseOrder = (value: string | number | null | undefined, fallback: number): number => {
  const next = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(next) ? next : fallback;
};

const parseInteger = (value: string | number | null | undefined): number | null => {
  const next = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(next) ? next : null;
};

const defaultNormalizeCustomSocialLabel = (value: unknown): string => normalizeTrimmed(value);

const cloneCustomItems = (
  items: ReadonlyArray<EditableThemeSettings['site']['socialLinks']['custom'][number]>
): EditableThemeSettings['site']['socialLinks']['custom'] =>
  items.map((item) => ({ ...item }));

const cloneNavItems = (
  items: ReadonlyArray<EditableThemeSettings['shell']['nav'][number]>
): EditableThemeSettings['shell']['nav'] =>
  items.map((item) => ({ ...item }));

const normalizeHomeIntroLinks = (value: unknown): HomeIntroLinkKey[] => {
  const defaultHomeIntroLinks = [...ADMIN_HOME_INTRO_LINK_DEFAULT] as HomeIntroLinkKey[];
  if (!Array.isArray(value)) return defaultHomeIntroLinks;

  const normalized: HomeIntroLinkKey[] = [];
  const seen = new Set<HomeIntroLinkKey>();

  value.forEach((item) => {
    const rawValue = normalizeTrimmed(item);
    if (!rawValue || !isAdminHomeIntroLinkKey(rawValue)) return;
    const linkKey = rawValue as HomeIntroLinkKey;
    if (seen.has(linkKey) || normalized.length >= ADMIN_HOME_INTRO_LINK_LIMIT) return;
    normalized.push(linkKey);
    seen.add(linkKey);
  });

  return normalized.length ? normalized : defaultHomeIntroLinks;
};

export const canonicalizeAdminThemeSettings = (
  settings: unknown,
  options: AdminThemeSettingsCanonicalizeOptions = {}
): EditableThemeSettings => {
  type SortableCustomItem = EditableThemeSettings['site']['socialLinks']['custom'][number] & { __index: number };

  const {
    footerStartYearMax = getAdminFooterStartYearMax(),
    defaultCustomSocialIconKey = 'website',
    normalizeCustomSocialLabel = defaultNormalizeCustomSocialLabel
  } = options;

  const next = isRecord(settings) ? settings : {};
  const site = isRecord(next.site) ? next.site : {};
  const shell = isRecord(next.shell) ? next.shell : {};
  const home = isRecord(next.home) ? next.home : {};
  const page = isRecord(next.page) ? next.page : {};
  const ui = isRecord(next.ui) ? next.ui : {};
  const siteFooter = isRecord(site.footer) ? site.footer : {};
  const adminOverview = isRecord(site.adminOverview) ? site.adminOverview : {};
  const socialLinks = isRecord(site.socialLinks) ? site.socialLinks : {};
  const customItems = Array.isArray(socialLinks.custom) ? socialLinks.custom : [];
  const bitsPage = isRecord(page.bits) ? page.bits : {};
  const bitsDefaultAuthor = isRecord(bitsPage.defaultAuthor) ? bitsPage.defaultAuthor : {};
  const rawPresetOrder = isRecord(socialLinks.presetOrder) ? socialLinks.presetOrder : {};
  const rawUiArticleMeta: LooseRecord = isRecord(ui.articleMeta) ? ui.articleMeta : {};
  const rawUiSidebarActions: LooseRecord = isRecord(ui.sidebarActions) ? ui.sidebarActions : {};
  const rawUiLayout: LooseRecord = isRecord(ui.layout) ? ui.layout : {};
  const rawUiTypography: LooseRecord = isRecord(ui.typography) ? ui.typography : {};
  const rawHeroPresetId = normalizeTrimmed(home.heroPresetId);
  const heroPresetId = isAdminHeroPresetId(rawHeroPresetId) ? rawHeroPresetId : 'default';
  const rawSidebarDivider = normalizeTrimmed(rawUiLayout.sidebarDivider);
  const rawTypographyReadable = normalizeTrimmed(rawUiTypography.readable);
  const rawTypographyCopy = normalizeTrimmed(rawUiTypography.copy);
  const rawTypographyMono = normalizeTrimmed(rawUiTypography.mono);
  const rawTypographyBrand = normalizeTrimmed(rawUiTypography.brand);

  const normalizedCustom: EditableThemeSettings['site']['socialLinks']['custom'] = customItems
    .map((item, index) => {
      const record = isRecord(item) ? item : {};
      const iconKey = normalizeAdminSocialIconKey(record.iconKey) ?? defaultCustomSocialIconKey;
      const sortableItem: SortableCustomItem = {
        id: normalizeTrimmed(record.id),
        label: normalizeCustomSocialLabel(record.label, iconKey),
        href: normalizeTrimmed(record.href),
        iconKey,
        visible: Boolean(record.visible),
        order: parseOrder(record.order as string | number | null | undefined, index + 1),
        __index: index
      };
      return sortableItem;
    })
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      const idCompare = a.id.localeCompare(b.id);
      if (idCompare !== 0) return idCompare;
      return a.__index - b.__index;
    })
    .map(({ __index: _ignored, ...item }) => item);

  const normalizedNav = (Array.isArray(shell.nav) ? shell.nav : [])
    .map((item) => {
      const record = isRecord(item) ? item : null;
      if (!record) return null;
      const id = normalizeTrimmed(record.id);
      if (!isAdminNavId(id)) return null;
      return {
        id,
        label: normalizeTrimmed(record.label),
        ornament: normalizeNavOrnament(record.ornament),
        order: parseOrder(record.order as string | number | null | undefined, ADMIN_NAV_IDS.indexOf(id) + 1),
        visible: Boolean(record.visible)
      };
    })
    .filter((item): item is EditableThemeSettings['shell']['nav'][number] => item !== null)
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return ADMIN_NAV_IDS.indexOf(a.id) - ADMIN_NAV_IDS.indexOf(b.id);
    });

  const heroImageSrc = (() => {
    if (heroPresetId === 'none') return null;

    const normalized = normalizeAdminHeroImageSrc(home.heroImageSrc);
    if (normalized === undefined) {
      const rawValue = normalizeTrimmed(home.heroImageSrc);
      return rawValue ? rawValue : null;
    }
    return normalized;
  })();

  const heroImageAlt = (() => {
    if (heroPresetId === 'none') return ADMIN_HERO_IMAGE_ALT_DEFAULT;

    const normalized = normalizeTrimmed(home.heroImageAlt);
    return normalized || ADMIN_HERO_IMAGE_ALT_DEFAULT;
  })();

  return {
    site: {
      title: normalizeTrimmed(site.title),
      description: normalizeMultiline(String(site.description ?? '')).trim(),
      defaultLocale: normalizeTrimmed(site.defaultLocale),
      footer: {
        startYear: parseInteger(siteFooter.startYear as string | number | null | undefined) ?? footerStartYearMax,
        showCurrentYear: Boolean(siteFooter.showCurrentYear),
        copyright: normalizeTrimmed(siteFooter.copyright)
      },
      adminOverview: {
        publicVisible: typeof adminOverview.publicVisible === 'boolean' ? adminOverview.publicVisible : true,
        hiddenMessage: normalizeSingleLine(
          adminOverview.hiddenMessage,
          ADMIN_OVERVIEW_HIDDEN_MESSAGE_DEFAULT
        )
      },
      socialLinks: {
        github: normalizeTrimmed(socialLinks.github) || null,
        x: normalizeTrimmed(socialLinks.x) || null,
        email: normalizeEmail(normalizeTrimmed(socialLinks.email)) || null,
        presetOrder: {
          github: parseOrder(
            rawPresetOrder.github as string | number | null | undefined,
            ADMIN_SOCIAL_PRESET_ORDER_DEFAULT.github
          ),
          x: parseOrder(rawPresetOrder.x as string | number | null | undefined, ADMIN_SOCIAL_PRESET_ORDER_DEFAULT.x),
          email: parseOrder(
            rawPresetOrder.email as string | number | null | undefined,
            ADMIN_SOCIAL_PRESET_ORDER_DEFAULT.email
          )
        },
        custom: normalizedCustom
      }
    },
    shell: {
      brandTitle: normalizeTrimmed(shell.brandTitle),
      quote: normalizeMultiline(String(shell.quote ?? '')).trim(),
      nav: normalizedNav
    },
    home: {
      introLead: normalizeMultiline(String(home.introLead ?? '')).trim(),
      introMore: normalizeMultiline(String(home.introMore ?? '')).trim(),
      introMoreLinks: normalizeHomeIntroLinks(home.introMoreLinks),
      showIntroLead: typeof home.showIntroLead === 'boolean' ? home.showIntroLead : true,
      showIntroMore: typeof home.showIntroMore === 'boolean' ? home.showIntroMore : true,
      heroPresetId,
      heroImageSrc,
      heroImageAlt
    },
    page: {
      essay: {
        title: normalizeOptionalSingleLine(String(isRecord(page.essay) ? page.essay.title ?? '' : '')),
        subtitle: normalizeOptionalSingleLine(String(isRecord(page.essay) ? page.essay.subtitle ?? '' : ''))
      },
      archive: {
        title: normalizeOptionalSingleLine(String(isRecord(page.archive) ? page.archive.title ?? '' : '')),
        subtitle: normalizeOptionalSingleLine(String(isRecord(page.archive) ? page.archive.subtitle ?? '' : ''))
      },
      bits: {
        title: normalizeOptionalSingleLine(String(bitsPage.title ?? '')),
        subtitle: normalizeOptionalSingleLine(String(bitsPage.subtitle ?? '')),
        defaultAuthor: {
          name: normalizeTrimmed(bitsDefaultAuthor.name),
          avatar: normalizeTrimmed(bitsDefaultAuthor.avatar)
        }
      },
      memo: {
        title: normalizeOptionalSingleLine(String(isRecord(page.memo) ? page.memo.title ?? '' : '')),
        subtitle: normalizeOptionalSingleLine(String(isRecord(page.memo) ? page.memo.subtitle ?? '' : ''))
      },
      about: {
        title: normalizeOptionalSingleLine(String(isRecord(page.about) ? page.about.title ?? '' : '')),
        subtitle: normalizeOptionalSingleLine(String(isRecord(page.about) ? page.about.subtitle ?? '' : ''))
      }
    },
    ui: {
      codeBlock: {
        showLineNumbers: Boolean(isRecord(ui.codeBlock) ? ui.codeBlock.showLineNumbers : false)
      },
      readingMode: {
        showEntry: Boolean(isRecord(ui.readingMode) ? ui.readingMode.showEntry : false)
      },
      sidebarActions: {
        showRssLink: typeof rawUiSidebarActions.showRssLink === 'boolean' ? rawUiSidebarActions.showRssLink : true,
        showThemeToggle: typeof rawUiSidebarActions.showThemeToggle === 'boolean'
          ? rawUiSidebarActions.showThemeToggle
          : true,
        showAdminEntry: typeof rawUiSidebarActions.showAdminEntry === 'boolean'
          ? rawUiSidebarActions.showAdminEntry
          : false
      },
      articleMeta: {
        showDate: typeof rawUiArticleMeta.showDate === 'boolean' ? rawUiArticleMeta.showDate : true,
        dateLabel: normalizeSingleLine(rawUiArticleMeta.dateLabel, ADMIN_ARTICLE_META_DATE_LABEL_DEFAULT),
        showTags: typeof rawUiArticleMeta.showTags === 'boolean' ? rawUiArticleMeta.showTags : true,
        showWordCount: typeof rawUiArticleMeta.showWordCount === 'boolean' ? rawUiArticleMeta.showWordCount : true,
        showReadingTime: typeof rawUiArticleMeta.showReadingTime === 'boolean'
          ? rawUiArticleMeta.showReadingTime
          : true
      },
      layout: {
        sidebarDivider: isAdminSidebarDividerVariant(rawSidebarDivider)
          ? rawSidebarDivider
          : ADMIN_SIDEBAR_DIVIDER_DEFAULT
      },
      typography: {
        readable: asThemeFontIdForRole('readable', rawTypographyReadable)
          ?? ADMIN_TYPOGRAPHY_DEFAULT.readable,
        copy: asThemeFontIdForRole('copy', rawTypographyCopy) ?? ADMIN_TYPOGRAPHY_DEFAULT.copy,
        mono: asThemeFontIdForRole('mono', rawTypographyMono) ?? ADMIN_TYPOGRAPHY_DEFAULT.mono,
        brand: asThemeFontIdForRole('brand', rawTypographyBrand) ?? ADMIN_TYPOGRAPHY_DEFAULT.brand
      }
    }
  };
};

export const createAdminWritableThemeSettingsGroups = (
  settings: EditableThemeSettings
): AdminWritableThemeSettingsGroups => ({
  site: {
    title: settings.site.title,
    description: settings.site.description,
    defaultLocale: settings.site.defaultLocale,
    footer: {
      ...settings.site.footer
    },
    adminOverview: {
      ...settings.site.adminOverview
    },
    socialLinks: {
      github: settings.site.socialLinks.github,
      x: settings.site.socialLinks.x,
      email: settings.site.socialLinks.email,
      presetOrder: {
        ...settings.site.socialLinks.presetOrder
      },
      custom: cloneCustomItems(settings.site.socialLinks.custom)
    }
  },
  shell: {
    brandTitle: settings.shell.brandTitle,
    quote: settings.shell.quote,
    nav: cloneNavItems(settings.shell.nav)
  },
  home: {
    ...settings.home,
    introMoreLinks: [...settings.home.introMoreLinks]
  },
  page: {
    essay: { ...settings.page.essay },
    archive: { ...settings.page.archive },
    bits: {
      title: settings.page.bits.title,
      subtitle: settings.page.bits.subtitle,
      defaultAuthor: {
        ...settings.page.bits.defaultAuthor
      }
    },
    memo: { ...settings.page.memo },
    about: { ...settings.page.about }
  },
  ui: {
    codeBlock: { ...settings.ui.codeBlock },
    readingMode: { ...settings.ui.readingMode },
    sidebarActions: { ...settings.ui.sidebarActions },
    articleMeta: { ...settings.ui.articleMeta },
    layout: { ...settings.ui.layout },
    typography: { ...settings.ui.typography }
  }
});

const createValidationIssue = (path: string, message: string): AdminThemeSettingsValidationIssue => ({
  path,
  message
});

export const validateAdminThemeSettings = (
  settings: EditableThemeSettings,
  options: AdminThemeSettingsValidateOptions = {}
): AdminThemeSettingsValidationIssue[] => {
  const footerStartYearMax = options.footerStartYearMax ?? getAdminFooterStartYearMax();
  const issues: AdminThemeSettingsValidationIssue[] = [];
  const pushIssue = (path: string, message: string): void => {
    issues.push(createValidationIssue(path, message));
  };

  if (!settings.site.title) pushIssue('site.title', 'Site title cannot be empty');
  if (!settings.site.description) pushIssue('site.description', 'Site description cannot be empty');
  if (!settings.site.defaultLocale) {
    pushIssue('site.defaultLocale', 'Default locale cannot be empty');
  } else if (!ADMIN_LOCALE_RE.test(settings.site.defaultLocale)) {
    pushIssue('site.defaultLocale', 'Invalid default locale format (example: zh-CN)');
  }

  if (!Number.isInteger(settings.site.footer?.startYear)) {
    pushIssue('site.footer.startYear', 'Footer start year must be an integer');
  } else if (
    settings.site.footer.startYear < ADMIN_FOOTER_START_YEAR_MIN ||
    settings.site.footer.startYear > footerStartYearMax
  ) {
    pushIssue('site.footer.startYear', 'Footer start year is out of the allowed range');
  }

  if (typeof settings.site.footer?.showCurrentYear !== 'boolean') {
    pushIssue('site.footer.showCurrentYear', 'Whether to show the current year must be a boolean');
  }

  if (!settings.site.footer?.copyright) {
    pushIssue('site.footer.copyright', 'Footer copyright line cannot be empty');
  } else if (
    settings.site.footer.copyright.includes('\n') ||
    settings.site.footer.copyright.includes('\r')
  ) {
    pushIssue('site.footer.copyright', 'Footer copyright line only allows single-line text');
  } else if (settings.site.footer.copyright.length > ADMIN_FOOTER_COPYRIGHT_MAX_LENGTH) {
    pushIssue('site.footer.copyright', `Footer copyright line cannot exceed ${ADMIN_FOOTER_COPYRIGHT_MAX_LENGTH} characters`);
  }

  if (typeof settings.site.adminOverview?.publicVisible !== 'boolean') {
    pushIssue('site.adminOverview.publicVisible', 'Admin Overview public visibility toggle must be a boolean');
  }

  if (!settings.site.adminOverview?.hiddenMessage) {
    pushIssue('site.adminOverview.hiddenMessage', 'Admin Overview hidden-state message cannot be empty');
  } else if (
    settings.site.adminOverview.hiddenMessage.includes('\n') ||
    settings.site.adminOverview.hiddenMessage.includes('\r')
  ) {
    pushIssue('site.adminOverview.hiddenMessage', 'Admin Overview hidden-state message only allows single-line text');
  } else if (settings.site.adminOverview.hiddenMessage.length > ADMIN_OVERVIEW_HIDDEN_MESSAGE_MAX_LENGTH) {
    pushIssue(
      'site.adminOverview.hiddenMessage',
      `Admin Overview hidden-state message cannot exceed ${ADMIN_OVERVIEW_HIDDEN_MESSAGE_MAX_LENGTH} characters`
    );
  }

  if (
    settings.site.socialLinks?.github &&
    !isAdminAllowedHttpsUrl(settings.site.socialLinks.github, ADMIN_GITHUB_HOSTS)
  ) {
    pushIssue('site.socialLinks.github', 'GitHub link only allows https://github.com/... ');
  }
  if (
    settings.site.socialLinks?.x &&
    !isAdminAllowedHttpsUrl(settings.site.socialLinks.x, ADMIN_X_HOSTS)
  ) {
    pushIssue('site.socialLinks.x', 'X / Twitter link only allows https://x.com/... or https://twitter.com/... ');
  }
  if (
    settings.site.socialLinks?.email &&
    !ADMIN_EMAIL_RE.test(normalizeEmail(settings.site.socialLinks.email))
  ) {
    pushIssue('site.socialLinks.email', 'Email must be a valid email address');
  }

  const presetOrder = settings.site.socialLinks.presetOrder;
  const customLinks = Array.isArray(settings.site.socialLinks?.custom) ? settings.site.socialLinks.custom : [];
  const socialOrderIssues = getAdminSocialOrderIssues(
    presetOrder,
    customLinks.map((item, index) => ({
      key: String(index),
      order: item.order
    }))
  );
  const presetOrderIssues = new Map<SiteSocialPresetId, 'range' | 'duplicate'>();
  const customOrderIssues = new Map<number, 'range' | 'duplicate'>();

  socialOrderIssues.forEach((issue) => {
    if (issue.scope === 'preset') {
      if (isAdminSocialPresetId(issue.key)) {
        presetOrderIssues.set(issue.key, issue.type);
      }
      return;
    }

    const index = Number.parseInt(issue.key, 10);
    if (Number.isInteger(index)) {
      customOrderIssues.set(index, issue.type);
    }
  });

  ADMIN_SOCIAL_PRESET_IDS.forEach((id) => {
    const rowLabel = id === 'github' ? 'GitHub' : id === 'x' ? 'X / Twitter' : 'Email';
    const orderIssue = presetOrderIssues.get(id);
    if (orderIssue === 'range') {
      pushIssue(
        `site.socialLinks.presetOrder.${id}`,
        `${rowLabel} position order must be an integer between ${ADMIN_SOCIAL_ORDER_MIN} and ${ADMIN_SOCIAL_ORDER_MAX}`
      );
      return;
    }
    if (orderIssue === 'duplicate') {
      pushIssue(`site.socialLinks.presetOrder.${id}`, `Social link position order cannot be duplicated: ${presetOrder[id]}`);
    }
  });

  if (customLinks.length > ADMIN_SOCIAL_CUSTOM_LIMIT) {
    pushIssue('site.socialLinks.custom', `You can add at most ${ADMIN_SOCIAL_CUSTOM_LIMIT} custom links`);
  }

  const seenCustomIds = new Set<string>();
  customLinks.forEach((item, index) => {
    const basePath = `site.socialLinks.custom[${index}]`;
    if (!item.id) {
      pushIssue(`${basePath}.id`, `Custom link #${index + 1} ID cannot be empty`);
    } else {
      if (item.id.includes('\n') || item.id.includes('\r')) {
        pushIssue(`${basePath}.id`, `Custom link #${index + 1} ID only allows single-line text`);
      }
      if (seenCustomIds.has(item.id)) {
        pushIssue(`${basePath}.id`, `Duplicate custom link ID: ${item.id}`);
      }
      seenCustomIds.add(item.id);
    }

    if (!item.label) {
      pushIssue(`${basePath}.label`, `Custom link #${index + 1} display name cannot be empty`);
    } else if (item.label.includes('\n') || item.label.includes('\r')) {
      pushIssue(`${basePath}.label`, `Custom link #${index + 1} display name only allows single-line text`);
    }

    if (!item.href || !isAdminAllowedHttpsUrl(item.href)) {
      pushIssue(`${basePath}.href`, `Custom link #${index + 1} link must be a valid https:// address`);
    }
    if (!isAdminSocialIconKey(item.iconKey)) {
      pushIssue(`${basePath}.iconKey`, `Custom link #${index + 1} icon must be chosen from the allowed list`);
    }
    const orderIssue = customOrderIssues.get(index);
    if (orderIssue === 'range') {
      pushIssue(
        `${basePath}.order`,
        `Custom link #${index + 1} position order must be an integer between ${ADMIN_SOCIAL_ORDER_MIN} and ${ADMIN_SOCIAL_ORDER_MAX}`
      );
    } else if (orderIssue === 'duplicate') {
      pushIssue(`${basePath}.order`, `Social link position order cannot be duplicated: ${item.order}`);
    }
    if (typeof item.visible !== 'boolean') {
      pushIssue(`${basePath}.visible`, `Custom link #${index + 1} visible must be a boolean`);
    }
  });

  if (!settings.shell.brandTitle) pushIssue('shell.brandTitle', 'Sidebar site name cannot be empty');
  if (!settings.shell.quote) pushIssue('shell.quote', 'Sidebar quote text cannot be empty');

  if (!settings.home.introLead) {
    pushIssue('home.introLead', 'Home page intro lead text cannot be empty');
  } else if (settings.home.introLead.length > ADMIN_HOME_INTRO_MAX_LENGTH) {
    pushIssue('home.introLead', `Home page intro lead text cannot exceed ${ADMIN_HOME_INTRO_MAX_LENGTH} characters`);
  }

  if (typeof settings.home.showIntroLead !== 'boolean') {
    pushIssue('home.showIntroLead', 'Home page intro lead text visibility toggle must be a boolean');
  }

  if (!settings.home.introMore) {
    pushIssue('home.introMore', 'Home page intro supplementary text cannot be empty');
  } else if (settings.home.introMore.length > ADMIN_HOME_INTRO_MAX_LENGTH) {
    pushIssue('home.introMore', `Home page intro supplementary text cannot exceed ${ADMIN_HOME_INTRO_MAX_LENGTH} characters`);
  }

  if (typeof settings.home.showIntroMore !== 'boolean') {
    pushIssue('home.showIntroMore', 'Home page intro supplementary text visibility toggle must be a boolean');
  }

  if (!Array.isArray(settings.home.introMoreLinks)) {
    pushIssue('home.introMoreLinks', 'Home page intro supplementary links must be an array');
  } else if (
    settings.home.introMoreLinks.length < 1 ||
    settings.home.introMoreLinks.length > ADMIN_HOME_INTRO_LINK_LIMIT
  ) {
    pushIssue('home.introMoreLinks', `You must select 1-${ADMIN_HOME_INTRO_LINK_LIMIT} entries for the home page intro supplementary links`);
  } else {
    const seenHomeIntroLinks = new Set<HomeIntroLinkKey>();
    settings.home.introMoreLinks.forEach((linkKey, index) => {
      if (!isAdminHomeIntroLinkKey(linkKey)) {
        pushIssue(`home.introMoreLinks[${index}]`, `Home page intro supplementary link #${index + 1} is invalid: ${String(linkKey)}`);
        return;
      }
      if (seenHomeIntroLinks.has(linkKey)) {
        pushIssue(`home.introMoreLinks[${index}]`, `Home page intro supplementary link cannot be duplicated: ${linkKey}`);
        return;
      }
      seenHomeIntroLinks.add(linkKey);
    });
  }

  if (!ADMIN_HERO_PRESET_SET.has(settings.home.heroPresetId)) {
    pushIssue('home.heroPresetId', 'Hero display mode only allows default/none');
  }

  if (
    settings.home.heroImageSrc !== null &&
    normalizeAdminHeroImageSrc(settings.home.heroImageSrc) === undefined
  ) {
    pushIssue(
      'home.heroImageSrc',
      'Hero image address only allows src/assets/**, public/** (or paths starting with /), and https:// image addresses'
    );
  } else if (settings.home.heroImageSrc) {
    const localFilePath = getAdminHeroImageLocalFilePath(settings.home.heroImageSrc);
    if (localFilePath && options.localFileExists && !options.localFileExists(localFilePath)) {
      pushIssue('home.heroImageSrc', `The local file the hero image points to does not exist: ${localFilePath}`);
    }
  }

  if (!settings.home.heroImageAlt) {
    pushIssue('home.heroImageAlt', 'Hero image description cannot be empty');
  } else if (
    settings.home.heroImageAlt.includes('\n') ||
    settings.home.heroImageAlt.includes('\r')
  ) {
    pushIssue('home.heroImageAlt', 'Hero image description only allows single-line text');
  } else if (settings.home.heroImageAlt.length > ADMIN_HERO_IMAGE_ALT_MAX_LENGTH) {
    pushIssue('home.heroImageAlt', `Hero image description cannot exceed ${ADMIN_HERO_IMAGE_ALT_MAX_LENGTH} characters`);
  }

  const pageTitleMap: Array<[string | null, string, string]> = [
    [settings.page.essay?.title, '/essay/ page main title', 'page.essay.title'],
    [settings.page.archive?.title, '/archive/ page main title', 'page.archive.title'],
    [settings.page.bits?.title, '/bits/ page main title', 'page.bits.title'],
    [settings.page.memo?.title, '/memo/ page main title', 'page.memo.title'],
    [settings.page.about?.title, '/about/ page main title', 'page.about.title']
  ];

  pageTitleMap.forEach(([title, label, path]) => {
    if (title == null) return;
    if (typeof title !== 'string') {
      pushIssue(path, `${label} must be a string or left empty`);
      return;
    }
    if (title.includes('\n') || title.includes('\r')) {
      pushIssue(path, `${label} only allows single-line text`);
    }
    if (title.length > ADMIN_PAGE_TITLE_MAX_LENGTH) {
      pushIssue(path, `${label} cannot exceed ${ADMIN_PAGE_TITLE_MAX_LENGTH} characters`);
    }
  });

  const pageSubtitleMap: Array<[string | null, string, string]> = [
    [settings.page.essay?.subtitle, '/essay/ page subtitle', 'page.essay.subtitle'],
    [settings.page.archive?.subtitle, '/archive/ page subtitle', 'page.archive.subtitle'],
    [settings.page.bits?.subtitle, '/bits/ page subtitle', 'page.bits.subtitle'],
    [settings.page.memo?.subtitle, '/memo/ page subtitle', 'page.memo.subtitle'],
    [settings.page.about?.subtitle, '/about/ page subtitle', 'page.about.subtitle']
  ];

  pageSubtitleMap.forEach(([subtitle, label, path]) => {
    if (subtitle == null) return;
    if (typeof subtitle !== 'string') {
      pushIssue(path, `${label} must be a string or left empty`);
      return;
    }
    if (subtitle.includes('\n') || subtitle.includes('\r')) {
      pushIssue(path, `${label} only allows single-line text`);
    }
    if (subtitle.length > ADMIN_PAGE_SUBTITLE_MAX_LENGTH) {
      pushIssue(path, `${label} cannot exceed ${ADMIN_PAGE_SUBTITLE_MAX_LENGTH} characters`);
    }
  });

  if (!settings.page.bits?.defaultAuthor?.name) {
    pushIssue('page.bits.defaultAuthor.name', 'Bits default author name cannot be empty');
  }
  if (settings.page.bits?.defaultAuthor?.avatar) {
    if (normalizeAdminBitsAvatarPath(settings.page.bits.defaultAuthor.avatar) === undefined) {
      pushIssue(
        'page.bits.defaultAuthor.avatar',
        'Bits default avatar only allows a relative image path (e.g. author/avatar.webp) — no public/ prefix, no leading /, and no URL, .., ?, or #'
      );
    }
  }

  if (typeof settings.ui?.articleMeta?.showDate !== 'boolean') {
    pushIssue('ui.articleMeta.showDate', 'The "show publish date" toggle in article meta must be a boolean');
  }

  if (typeof settings.ui?.articleMeta?.dateLabel !== 'string') {
    pushIssue('ui.articleMeta.dateLabel', 'The "date prefix" in article meta must be a string');
  } else if (
    settings.ui.articleMeta.dateLabel.includes('\n') ||
    settings.ui.articleMeta.dateLabel.includes('\r')
  ) {
    pushIssue('ui.articleMeta.dateLabel', 'The "date prefix" in article meta only allows single-line text');
  } else if (settings.ui.articleMeta.dateLabel.length > ADMIN_ARTICLE_META_DATE_LABEL_MAX_LENGTH) {
    pushIssue(
      'ui.articleMeta.dateLabel',
      `The "date prefix" in article meta cannot exceed ${ADMIN_ARTICLE_META_DATE_LABEL_MAX_LENGTH} characters`
    );
  }

  if (typeof settings.ui?.articleMeta?.showTags !== 'boolean') {
    pushIssue('ui.articleMeta.showTags', 'The "show tags" toggle in article meta must be a boolean');
  }

  if (typeof settings.ui?.articleMeta?.showWordCount !== 'boolean') {
    pushIssue('ui.articleMeta.showWordCount', 'The "show word count" toggle in article meta must be a boolean');
  }

  if (typeof settings.ui?.articleMeta?.showReadingTime !== 'boolean') {
    pushIssue('ui.articleMeta.showReadingTime', 'The "show reading time" toggle in article meta must be a boolean');
  }

  if (typeof settings.ui?.sidebarActions?.showRssLink !== 'boolean') {
    pushIssue('ui.sidebarActions.showRssLink', 'The "show RSS entry" toggle in sidebar icons must be a boolean');
  }

  if (typeof settings.ui?.sidebarActions?.showThemeToggle !== 'boolean') {
    pushIssue('ui.sidebarActions.showThemeToggle', 'The "show theme toggle entry" toggle in sidebar icons must be a boolean');
  }

  if (typeof settings.ui?.sidebarActions?.showAdminEntry !== 'boolean') {
    pushIssue('ui.sidebarActions.showAdminEntry', 'The "show /admin/ entry" toggle in sidebar icons must be a boolean');
  }

  if (!isAdminSidebarDividerVariant(settings.ui?.layout?.sidebarDivider ?? '')) {
    pushIssue('ui.layout.sidebarDivider', 'Sidebar divider only allows Default / Subtle / Hidden');
  }

  if (!isAdminTypographyFontId('readable', settings.ui?.typography?.readable ?? '')) {
    pushIssue('ui.typography.readable', 'Body font must be selected from the registry options');
  }

  if (!isAdminTypographyFontId('copy', settings.ui?.typography?.copy ?? '')) {
    pushIssue('ui.typography.copy', 'Copy font must be selected from the registry options');
  }

  if (!isAdminTypographyFontId('mono', settings.ui?.typography?.mono ?? '')) {
    pushIssue('ui.typography.mono', 'Monospace font must be selected from the registry options');
  }
  if (!isAdminTypographyFontId('brand', settings.ui?.typography?.brand ?? '')) {
    pushIssue('ui.typography.brand', 'Brand font must be selected from the registry options');
  }

  const nav = Array.isArray(settings.shell.nav) ? settings.shell.nav : [];
  if (nav.length !== ADMIN_NAV_IDS.length) {
    pushIssue('shell.nav', 'The number of sidebar nav items must match the existing navigation');
  }

  const seenIds = new Set<SidebarNavId>();
  const navOrderIssues = new Map<SidebarNavId, 'range' | 'duplicate'>();
  getAdminNavOrderIssues(
    nav.flatMap((item) =>
      ADMIN_NAV_IDS.includes(item.id)
        ? [
            {
              key: item.id as SidebarNavId,
              order: item.order
            }
          ]
        : []
    )
  ).forEach((issue) => {
    navOrderIssues.set(issue.key, issue.type);
  });

  nav.forEach((item, index) => {
    const navId = ADMIN_NAV_IDS.includes(item.id) ? item.id : null;
    const basePath = navId ? `shell.nav.${navId}` : `shell.nav[${index}]`;
    if (!navId) {
      pushIssue(`${basePath}.id`, `Invalid nav item ID: ${item.id}`);
    } else if (seenIds.has(navId)) {
      pushIssue(`${basePath}.id`, `Duplicate nav item ID: ${navId}`);
    }
    if (navId) seenIds.add(navId);

    if (!item.label) {
      pushIssue(`${basePath}.label`, `Display name for nav item ${item.id} cannot be empty`);
    }
    if (item.ornament !== null) {
      if (typeof item.ornament !== 'string') {
        pushIssue(`${basePath}.ornament`, `Ornament for nav item ${item.id} must be a string or left empty`);
      } else if (item.ornament.includes('\n') || item.ornament.includes('\r')) {
        pushIssue(`${basePath}.ornament`, `Ornament for nav item ${item.id} only allows single-line text`);
      } else if (item.ornament.length > ADMIN_NAV_ORNAMENT_MAX_LENGTH) {
        pushIssue(`${basePath}.ornament`, `Ornament for nav item ${item.id} cannot exceed ${ADMIN_NAV_ORNAMENT_MAX_LENGTH} characters`);
      }
    }
    if (
      !Number.isInteger(item.order) ||
      item.order < ADMIN_NAV_ORDER_MIN ||
      item.order > ADMIN_NAV_ORDER_MAX
    ) {
      pushIssue(`${basePath}.order`, `Position order for nav item ${item.id} must be an integer between ${ADMIN_NAV_ORDER_MIN} and ${ADMIN_NAV_ORDER_MAX}`);
    } else if (navId && navOrderIssues.get(navId) === 'duplicate') {
      pushIssue(`${basePath}.order`, `Position order cannot be duplicated: ${item.order}`);
    }
    if (typeof item.visible !== 'boolean') {
      pushIssue(`${basePath}.visible`, `visible for nav item ${item.id} must be a boolean`);
    }
  });

  return issues;
};

const appendPathSegment = (basePath: string, segment: string): string => {
  if (!basePath) return segment;
  if (segment.startsWith('[')) return `${basePath}${segment}`;
  return `${basePath}.${segment}`;
};

const MISSING_CHANGE_VALUE = Symbol('adminThemeSettingsMissingValue');

const createChangePath = (basePath: string): string => basePath || 'root';

const formatChangePreviewValue = (
  value: unknown | typeof MISSING_CHANGE_VALUE
): string => {
  if (value === MISSING_CHANGE_VALUE) return '(missing)';
  if (typeof value === 'undefined') return 'undefined';
  if (value === null) return 'null';

  if (typeof value === 'string') {
    return value.length > 0 ? JSON.stringify(value) : '""';
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }

  if (isRecord(value)) {
    return `Object(${Object.keys(value).length})`;
  }

  return String(value);
};

const createChangePreview = (
  path: string,
  before: unknown | typeof MISSING_CHANGE_VALUE,
  after: unknown | typeof MISSING_CHANGE_VALUE
): AdminThemeSettingsChangePreview => {
  const kind: AdminThemeSettingsChangeKind = before === MISSING_CHANGE_VALUE
    ? 'added'
    : after === MISSING_CHANGE_VALUE
      ? 'removed'
      : 'updated';

  return {
    path,
    kind,
    before: formatChangePreviewValue(before),
    after: formatChangePreviewValue(after)
  };
};

const collectMismatchPaths = (
  actual: unknown,
  expected: unknown,
  mode: AdminThemeSettingsMismatchMode,
  basePath = '',
  mismatches: string[] = []
): string[] => {
  if (Array.isArray(actual) || Array.isArray(expected)) {
    if (!Array.isArray(actual) || !Array.isArray(expected) || actual.length !== expected.length) {
      mismatches.push(basePath || 'root');
      return mismatches;
    }

    actual.forEach((item, index) => {
      collectMismatchPaths(item, expected[index], mode, appendPathSegment(basePath, `[${index}]`), mismatches);
    });
    return mismatches;
  }

  if (isRecord(actual) || isRecord(expected)) {
    if (!isRecord(actual) || !isRecord(expected)) {
      mismatches.push(basePath || 'root');
      return mismatches;
    }

    const actualKeys = Object.keys(actual);
    const expectedKeys = Object.keys(expected);
    const keys = mode === 'exact' ? Array.from(new Set([...actualKeys, ...expectedKeys])) : actualKeys;

    keys.forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(actual, key) || !Object.prototype.hasOwnProperty.call(expected, key)) {
        mismatches.push(appendPathSegment(basePath, key));
        return;
      }

      collectMismatchPaths(actual[key], expected[key], mode, appendPathSegment(basePath, key), mismatches);
    });
    return mismatches;
  }

  if (!Object.is(actual, expected)) {
    mismatches.push(basePath || 'root');
  }
  return mismatches;
};

export const getAdminThemeSettingsMismatchPaths = (
  actual: unknown,
  expected: unknown,
  mode: AdminThemeSettingsMismatchMode = 'exact'
): string[] => Array.from(new Set(collectMismatchPaths(actual, expected, mode)));

const fillAdminThemeSettingsSiteCompatibilityDefaults = (
  rawSite: LooseRecord,
  canonicalSite: LooseRecord
): LooseRecord => {
  const canonicalAdminOverview = canonicalSite.adminOverview;
  if (!isRecord(canonicalAdminOverview)) return rawSite;

  const rawAdminOverview = rawSite.adminOverview;
  if (rawAdminOverview === undefined) {
    return {
      ...rawSite,
      adminOverview: canonicalAdminOverview
    };
  }

  if (!isRecord(rawAdminOverview)) return rawSite;

  return {
    ...rawSite,
    adminOverview: {
      publicVisible: canonicalAdminOverview.publicVisible,
      hiddenMessage: canonicalAdminOverview.hiddenMessage,
      ...rawAdminOverview
    }
  };
};

/* Field table for ui.* group compatibility backfill: register new groups here instead of duplicating merge blocks. */
const UI_COMPATIBILITY_GROUP_FIELDS: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['sidebarActions', ['showRssLink', 'showThemeToggle', 'showAdminEntry']],
  ['typography', ['readable', 'copy', 'mono', 'brand']]
];

const fillAdminThemeSettingsUiCompatibilityDefaults = (
  rawUi: LooseRecord,
  canonicalUi: LooseRecord
): LooseRecord => {
  let next = rawUi;

  for (const [key, fields] of UI_COMPATIBILITY_GROUP_FIELDS) {
    const canonicalGroup = canonicalUi[key];
    if (!isRecord(canonicalGroup)) continue;

    const rawGroup = next[key];
    if (rawGroup === undefined) {
      next = { ...next, [key]: canonicalGroup };
    } else if (isRecord(rawGroup)) {
      const defaults = Object.fromEntries(fields.map((field) => [field, canonicalGroup[field]]));
      next = { ...next, [key]: { ...defaults, ...rawGroup } };
    }
  }

  return next;
};

export const fillAdminThemeSettingsGroupCompatibilityDefaults = (
  group: ThemeSettingsFileGroup,
  rawGroup: unknown,
  canonicalGroup: unknown
): unknown => {
  if (!isRecord(rawGroup) || !isRecord(canonicalGroup)) return rawGroup;
  if (group === 'site') return fillAdminThemeSettingsSiteCompatibilityDefaults(rawGroup, canonicalGroup);
  if (group === 'ui') return fillAdminThemeSettingsUiCompatibilityDefaults(rawGroup, canonicalGroup);
  return rawGroup;
};

export const fillAdminThemeSettingsCompatibilityDefaults = (
  settings: unknown,
  canonicalSettings: EditableThemeSettings
): unknown => {
  if (!isRecord(settings)) return settings;

  return {
    ...settings,
    ...(isRecord(settings.site)
      ? {
          site: fillAdminThemeSettingsSiteCompatibilityDefaults(
            settings.site,
            canonicalSettings.site as unknown as LooseRecord
          )
        }
      : {}),
    ...(isRecord(settings.ui)
      ? {
          ui: fillAdminThemeSettingsUiCompatibilityDefaults(
            settings.ui,
            canonicalSettings.ui as unknown as LooseRecord
          )
        }
      : {})
  };
};

const collectChangePreviews = (
  actual: unknown,
  expected: unknown,
  mode: AdminThemeSettingsMismatchMode,
  basePath = '',
  changes: AdminThemeSettingsChangePreview[] = []
): AdminThemeSettingsChangePreview[] => {
  if (Array.isArray(actual) || Array.isArray(expected)) {
    if (!Array.isArray(actual) || !Array.isArray(expected) || actual.length !== expected.length) {
      changes.push(createChangePreview(createChangePath(basePath), actual, expected));
      return changes;
    }

    actual.forEach((item, index) => {
      collectChangePreviews(item, expected[index], mode, appendPathSegment(basePath, `[${index}]`), changes);
    });
    return changes;
  }

  if (isRecord(actual) || isRecord(expected)) {
    if (!isRecord(actual) || !isRecord(expected)) {
      changes.push(createChangePreview(createChangePath(basePath), actual, expected));
      return changes;
    }

    const actualKeys = Object.keys(actual);
    const expectedKeys = Object.keys(expected);
    const keys = mode === 'exact' ? Array.from(new Set([...actualKeys, ...expectedKeys])) : actualKeys;

    keys.forEach((key) => {
      const path = appendPathSegment(basePath, key);
      const hasActual = Object.prototype.hasOwnProperty.call(actual, key);
      const hasExpected = Object.prototype.hasOwnProperty.call(expected, key);

      if (!hasActual || !hasExpected) {
        changes.push(createChangePreview(
          path,
          hasActual ? actual[key] : MISSING_CHANGE_VALUE,
          hasExpected ? expected[key] : MISSING_CHANGE_VALUE
        ));
        return;
      }

      collectChangePreviews(actual[key], expected[key], mode, path, changes);
    });
    return changes;
  }

  if (!Object.is(actual, expected)) {
    changes.push(createChangePreview(createChangePath(basePath), actual, expected));
  }
  return changes;
};

export const getAdminThemeSettingsChangePreviews = (
  actual: unknown,
  expected: unknown,
  mode: AdminThemeSettingsMismatchMode = 'exact'
): AdminThemeSettingsChangePreview[] => {
  const changes = collectChangePreviews(actual, expected, mode);
  const seenPaths = new Set<string>();

  return changes.filter((change) => {
    if (seenPaths.has(change.path)) return false;
    seenPaths.add(change.path);
    return true;
  });
};

export const createAdminThemeSettingsCanonicalMismatchIssues = (
  actual: unknown,
  expected: unknown,
  options: { mode?: AdminThemeSettingsMismatchMode; pathPrefix?: string; messagePrefix?: string } = {}
): AdminThemeSettingsValidationIssue[] => {
  const {
    mode = 'exact',
    pathPrefix = '',
    messagePrefix = 'The config value will change after normalization; please fix the original input first'
  } = options;
  const mismatchPaths = getAdminThemeSettingsMismatchPaths(actual, expected, mode);
  return mismatchPaths.map((path) => {
    const normalizedPath = path === 'root'
      ? (pathPrefix || 'root')
      : pathPrefix
        ? appendPathSegment(pathPrefix, path)
        : path;
    return createValidationIssue(normalizedPath, `${messagePrefix}：${normalizedPath}`);
  });
};

export const getAdminThemeSettingsGroupFileName = (group: ThemeSettingsFileGroup): string => `${group}.json`;
