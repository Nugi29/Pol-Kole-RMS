import { Component, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';

import { DialogService } from '../../../services/dialog.service';
import { LookupRes, LookupService } from '../../../services/lookup.service';
import { FullUserRes, UserService } from '../../../services/user.service';
import { compareById } from '../../../shared/utils/ui-utils';
import {
  matchesUserSearch,
  toCreateUserPayload,
  toUpdateUserPayload,
  UserFormValue,
  UserSearchValue,
} from './user.helpers';

@Component({
  selector: 'app-user',
  standalone: false,
  templateUrl: './user.component.html',
  styleUrl: './user.component.css',
})
export class UserComponent implements OnInit {
  private paginator: MatPaginator | null = null;

  @ViewChild(MatPaginator) set matPaginator(mp: MatPaginator) {
    this.paginator = mp;
    this.dataSource.paginator = mp;
  }

  // Data
  roles: LookupRes[] = [];
  statuses: LookupRes[] = [];
  users: FullUserRes[] = [];
  filteredUsers: FullUserRes[] = [];

  // Table
  displayedColumns = ['name', 'email', 'phone', 'role', 'status', 'createdOn', 'actions'];
  dataSource = new MatTableDataSource<FullUserRes>([]);
  compareLookupById = compareById;

  // State
  form: FormGroup;
  editingId: number | null = null;
  loading = false;
  errorMessage = '';
  searchQuery = '';
  selectedRoleId: number | null = null;
  selectedStatusId: number | null = null;

  // Counter metrics
  totalUsersCount = 0;
  activeUsersCount = 0;
  adminCount = 0;
  managerCount = 0;

  constructor(
    private readonly fb: FormBuilder,
    private readonly lookupService: LookupService,
    private readonly userService: UserService,
    private readonly dialogService: DialogService,
  ) {
    this.form = this.fb.group(
      {
        username: ['', [Validators.required, Validators.maxLength(100)]],
        email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
        password: [''],
        confirmpassword: [''],
        phone: ['', [Validators.required, Validators.maxLength(20)]],
        userroles: [null as LookupRes | null, [Validators.required]],
        userstatuses: [null as LookupRes | null, [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  ngOnInit(): void {
    this.loadLookups();
    this.loadUsers();
  }

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmpassword')?.value;
    if (password && confirm && password !== confirm) {
      return { passwordMismatch: true };
    }
    return null;
  }

  loadLookups(): void {
    this.lookupService.getAllUserRoles().subscribe({
      next: (roles) => {
        this.roles = roles || [];
      },
      error: (err) => {
        console.error('Failed to load user roles', err);
        this.roles = [];
      },
    });

    this.lookupService.getAllUserStatuses().subscribe({
      next: (statuses) => {
        this.statuses = statuses || [];
      },
      error: (err) => {
        console.error('Failed to load user statuses', err);
        this.statuses = [];
      },
    });
  }

  loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';
    this.userService.getAllUsers().subscribe({
      next: (users: FullUserRes[]) => {
        const data = users || [];
        this.users = data;
        this.applyFilters();
        this.calculateMetrics();
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load users', err);
        this.errorMessage = 'Failed to load staff accounts directory.';
        this.users = [];
        this.applyFilters();
        this.calculateMetrics();
        this.loading = false;
      },
    });
  }

  calculateMetrics(): void {
    this.totalUsersCount = this.users.length;
    this.activeUsersCount = this.users.filter(
      (u) => u.status?.name?.toLowerCase() === 'active' || u.status?.id === 1
    ).length;
    this.adminCount = this.users.filter(
      (u) => u.role?.name?.toLowerCase() === 'admin' || u.role?.id === 1
    ).length;
    this.managerCount = this.users.filter(
      (u) => u.role?.name?.toLowerCase() === 'manager' || u.role?.id === 2
    ).length;
  }

  applyFilters(): void {
    const filterState: UserSearchValue = {
      query: this.searchQuery,
      roleId: this.selectedRoleId,
      statusId: this.selectedStatusId,
    };

    this.filteredUsers = this.users.filter((u) => matchesUserSearch(u, filterState));
    this.dataSource.data = this.filteredUsers;
    this.paginator?.firstPage();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedRoleId = null;
    this.selectedStatusId = null;
    this.applyFilters();
  }

  saveUser(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue() as UserFormValue;
    this.loading = true;
    this.errorMessage = '';

    if (this.editingId) {
      // Update existing employee
      const payload = toUpdateUserPayload(formValue, this.editingId);
      this.userService.update(this.editingId, payload).subscribe({
        next: () => {
          this.loadUsers();
          this.clearForm();
          this.loading = false;
          this.dialogService.showSuccess('Staff Updated', 'Employee profile updated successfully.');
        },
        error: (err) => {
          this.loading = false;
          if (err?.status === 409) {
            this.errorMessage = 'An employee with this company email already exists.';
          } else {
            this.errorMessage = err.error?.message || 'Failed to update employee profile.';
          }
          this.dialogService.showError('Update Failed', this.errorMessage);
        },
      });
    } else {
      // Create new employee
      const payload = toCreateUserPayload(formValue);
      this.userService.create(payload).subscribe({
        next: () => {
          this.loadUsers();
          this.clearForm();
          this.loading = false;
          this.dialogService.showSuccess('Staff Registered', 'New employee account registered successfully.');
        },
        error: (err) => {
          this.loading = false;
          if (err?.status === 409) {
            this.errorMessage = 'An employee with this company email already exists.';
          } else {
            this.errorMessage = err.error?.message || 'Failed to register employee account.';
          }
          this.dialogService.showError('Registration Failed', this.errorMessage);
        },
      });
    }
  }

  editUser(user: FullUserRes): void {
    this.editingId = user.id || null;
    this.errorMessage = '';

    const matchedRole = this.roles.find((r) => r.id === user.role?.id) || user.role;
    const matchedStatus = this.statuses.find((s) => s.id === user.status?.id) || user.status;

    this.form.patchValue({
      username: user.name,
      email: user.email,
      password: '',
      confirmpassword: '',
      phone: user.phone || '',
      userroles: matchedRole,
      userstatuses: matchedStatus,
    });

    this.form.get('password')?.setValidators([Validators.minLength(6)]);
    this.form.get('password')?.updateValueAndValidity();
  }

  deleteUser(id: number): void {
    const user = this.users.find((u) => u.id === id);
    const userLabel = user ? `staff account for "${user.name}"` : 'this staff account';
    
    this.dialogService.confirmDelete(
      userLabel,
      `Are you sure you want to delete ${userLabel}?<br>System login and module privileges will be removed.`
    ).subscribe((confirmed) => {
      if (confirmed) {
        this.loading = true;
        this.userService.delete(id).subscribe({
          next: () => {
            this.loadUsers();
            this.loading = false;
            this.dialogService.showSuccess('Account Removed', `${userLabel} was removed successfully.`);
          },
          error: (err) => {
            console.error('Failed to delete user', err);
            this.loading = false;
            this.errorMessage = 'Failed to remove user account.';
            this.dialogService.showError('Delete Failed', this.errorMessage);
          },
        });
      }
    });
  }

  requestClear(): void {
    if (this.form.dirty || this.editingId) {
      this.dialogService.confirmClear().subscribe((confirmed) => {
        if (confirmed) {
          this.clearForm();
          this.dialogService.showSuccess('Cleared', 'Form fields cleared successfully.');
        }
      });
    } else {
      this.clearForm();
    }
  }

  clearForm(): void {
    this.editingId = null;
    this.errorMessage = '';
    const defaultStatus = this.statuses.find((s) => s.name?.toLowerCase() === 'active') || this.statuses[0] || null;

    this.form.reset({
      username: '',
      email: '',
      password: '',
      confirmpassword: '',
      phone: '',
      userroles: null,
      userstatuses: defaultStatus,
    });

    this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.get('password')?.updateValueAndValidity();
  }

  getRoleBadgeClass(roleName?: string): string {
    switch (roleName?.toLowerCase()) {
      case 'admin':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'manager':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'receptionist':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'chef':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'waiter':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'cashier':
        return 'bg-cyan-50 text-cyan-700 border border-cyan-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  }
}
