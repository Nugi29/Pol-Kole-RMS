export interface Identifiable {
  id: number;
}

export interface DialogMessageData {
  heading: string;
  message: string;
}

export interface SearchFilter {
  username: string;
  roleId: number | null;
}

export function compareById<T extends Identifiable>(first: T | null, second: T | null): boolean {
  if (!first && !second) {
    return true;
  }

  if (!first || !second) {
    return false;
  }

  return first.id === second.id;
}

export function normalizeText(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

export function splitMessageLines(message: string | null | undefined): string[] {
  return String(message ?? '')
    .split(/<br\s*\/?>/i)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function buildSearchFilter(username: unknown, roleId: unknown): string {
  return JSON.stringify({
    username: normalizeText(username),
    roleId: roleId === null || roleId === undefined || roleId === '' ? null : Number(roleId),
  });
}

export function parseSearchFilter(filter: string): SearchFilter {
  return JSON.parse(filter) as SearchFilter;
}

export function matchesSearchFilter<T>(
  row: T,
  filter: SearchFilter,
  extractors: {
    text: (row: T) => unknown;
    roleId: (row: T) => number | null | undefined;
  },
): boolean {
  const rowText = normalizeText(extractors.text(row));
  const rowRoleId = extractors.roleId(row);

  const usernameOk = !filter.username || rowText.includes(filter.username);
  const roleOk = !filter.roleId || rowRoleId === filter.roleId;

  return usernameOk && roleOk;
}


