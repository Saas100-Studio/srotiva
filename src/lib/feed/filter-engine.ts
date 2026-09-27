import { FeedFilterType } from "@prisma/client";

type FilterableItem = {
  title: string | null;
  descriptionText: string | null;
  canonicalUrl: string | null;
  url: string | null;
  author: string | null;
};

export type KeywordFilter = {
  id: string;
  type: FeedFilterType;
  field: string | null;
  value: unknown;
  isEnabled: boolean;
};

export type FilterReason =
  | {
      code: "BLACKLIST_MATCH";
      type: "blacklist";
      filterId: string;
      field: string;
      keyword: string;
    }
  | {
      code: "WHITELIST_NO_MATCH";
      type: "whitelist";
      filterIds: string[];
    };

export type FilterResult =
  | { included: true; reason: null }
  | { included: false; reason: FilterReason };

const fields = ["title", "description", "url", "author"] as const;
type FilterField = (typeof fields)[number] | "any";

function normalize(value: string | null): string {
  return value?.normalize("NFKC").replace(/\s+/gu, " ").trim().toLowerCase() ?? "";
}

function keywords(filter: KeywordFilter): string[] {
  if (!filter.value || typeof filter.value !== "object" || !("keywords" in filter.value)) return [];
  const values = (filter.value as { keywords?: unknown }).keywords;
  if (!Array.isArray(values)) return [];
  return [...new Set(values
    .filter((value): value is string => typeof value === "string")
    .map(normalize)
    .filter(Boolean))];
}

function filterField(value: string | null): FilterField | null {
  const normalized = value?.trim().toLowerCase() ?? "any";
  return normalized === "any" || fields.includes(normalized as (typeof fields)[number])
    ? normalized as FilterField
    : null;
}

function searchable(item: FilterableItem): Record<(typeof fields)[number], string> {
  return {
    title: normalize(item.title),
    description: normalize(item.descriptionText),
    url: normalize([item.canonicalUrl, item.url].filter(Boolean).join(" ")),
    author: normalize(item.author),
  };
}

function firstMatch(
  item: Record<(typeof fields)[number], string>,
  filter: KeywordFilter,
): { field: string; keyword: string } | null {
  const field = filterField(filter.field);
  if (!field) return null;
  const candidates = field === "any" ? fields : [field];
  for (const keyword of keywords(filter)) {
    const matchedField = candidates.find((candidate) => item[candidate].includes(keyword));
    if (matchedField) return { field: matchedField, keyword };
  }
  return null;
}

export function applyFilters({
  item,
  filters,
}: {
  item: FilterableItem;
  filters: KeywordFilter[];
}): FilterResult {
  const usable = filters.filter((filter) => filter.isEnabled && keywords(filter).length > 0 && filterField(filter.field));
  const text = searchable(item);

  for (const filter of usable) {
    if (filter.type !== FeedFilterType.BLACKLIST) continue;
    const match = firstMatch(text, filter);
    if (match) {
      return {
        included: false,
        reason: {
          code: "BLACKLIST_MATCH",
          type: "blacklist",
          filterId: filter.id,
          ...match,
        },
      };
    }
  }

  const whitelists = usable.filter((filter) => filter.type === FeedFilterType.WHITELIST);
  if (whitelists.length && !whitelists.some((filter) => firstMatch(text, filter))) {
    return {
      included: false,
      reason: {
        code: "WHITELIST_NO_MATCH",
        type: "whitelist",
        filterIds: whitelists.map((filter) => filter.id),
      },
    };
  }

  return { included: true, reason: null };
}
