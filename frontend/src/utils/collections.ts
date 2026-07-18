export function normalizeSearchValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).toLowerCase();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeSearchValue(entry)).join(" ");
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map((entry) => normalizeSearchValue(entry))
      .join(" ");
  }

  return "";
}

export function matchesSearch(query: string, values: unknown[]): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return values.some((value) => normalizeSearchValue(value).includes(normalizedQuery));
}

export function getPageCount(totalItems: number, pageSize: number) {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function clampPage(page: number, totalItems: number, pageSize: number) {
  return Math.min(Math.max(page, 1), getPageCount(totalItems, pageSize));
}

export function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const safePage = clampPage(page, items.length, pageSize);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    pageSize,
    totalItems: items.length,
    totalPages: getPageCount(items.length, pageSize),
    items: items.slice(start, start + pageSize)
  };
}
