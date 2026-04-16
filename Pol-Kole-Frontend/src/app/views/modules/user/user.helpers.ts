import { CreateUserPayload, FullUserRes, UpdateUserPayload } from '../../../services/user.service';
import { LookupRes } from '../../../services/lookup.service';
import { buildSearchFilter, matchesSearchFilter, parseSearchFilter } from '../../../shared/utils/ui-utils';

export interface UserFormValue {
  username: string;
  email: string;
  password: string;
  confirmpassword: string;
  phone: string;
  userroles: LookupRes | null;
  userstatuses: LookupRes | null;
  updated: string;
}

export interface UserSearchValue {
  ssusername: string;
  ssrole: number | null;
}

export function toCreateUserPayload(value: UserFormValue): CreateUserPayload {
  return {
    name: String(value.username ?? '').trim(),
    email: String(value.email ?? '').trim(),
    password: String(value.password ?? '').trim(),
    phone: String(value.phone ?? '').trim(),
    role: String(value.userroles?.name ?? '').trim(),
    status: String(value.userstatuses?.name ?? '').trim(),
  };
}

export function toUpdateUserPayload(value: UserFormValue, id?: number): UpdateUserPayload {
  const password = String(value.password ?? '').trim();
  const role = String(value.userroles?.name ?? '').trim();
  const status = String(value.userstatuses?.name ?? '').trim();

  return {
    ...(id ? { id } : {}),
    name: String(value.username ?? '').trim(),
    email: String(value.email ?? '').trim(),
    ...(password ? { password } : {}),
    phone: String(value.phone ?? '').trim(),
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
  };
}

export function createUserSearchFilter(value: UserSearchValue): string {
  return buildSearchFilter(value.ssusername, value.ssrole);
}

export function matchesUserSearch<T extends FullUserRes>(row: T, filter: string): boolean {
  if (!filter.trim()) {
    return true;
  }

  const criteria = parseSearchFilter(filter);

  return matchesSearchFilter(row, criteria, {
    text: (item) => item.name,
    roleId: (item) => item.role?.id ?? null,
  });
}


