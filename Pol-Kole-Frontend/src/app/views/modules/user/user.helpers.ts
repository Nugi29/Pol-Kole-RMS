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
  query: string;
  roleId: number | null;
  statusId: number | null;
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

export function matchesUserSearch<T extends FullUserRes>(
  row: T,
  search: { query: string; roleId: number | null; statusId: number | null }
): boolean {
  if (search.roleId != null && row.role?.id !== search.roleId) {
    return false;
  }

  if (search.statusId != null && row.status?.id !== search.statusId) {
    return false;
  }

  if (!search.query.trim()) {
    return true;
  }

  const q = search.query.toLowerCase().trim();
  const nameMatch = (row.name || '').toLowerCase().includes(q);
  const emailMatch = (row.email || '').toLowerCase().includes(q);
  const phoneMatch = (row.phone || '').toLowerCase().includes(q);
  const roleMatch = (row.role?.name || '').toLowerCase().includes(q);

  return nameMatch || emailMatch || phoneMatch || roleMatch;
}



