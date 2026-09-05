import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { UserComponent } from './user.component';
import { DialogService } from '../../../services/dialog.service';
import { LookupService } from '../../../services/lookup.service';
import { FullUserRes, UserService } from '../../../services/user.service';
import { ConfirmComponent } from '../../../shared/dialog/confirm/confirm.component';
import { MessageComponent } from '../../../shared/dialog/message/message.component';

describe('UserComponent', () => {
  let component: UserComponent;
  let fixture: ComponentFixture<UserComponent>;
  let lookupServiceSpy: {
    getAllUserRoles: ReturnType<typeof vi.fn>;
    getAllUserStatuses: ReturnType<typeof vi.fn>;
  };
  let userServiceSpy: {
    getAllUsers: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let dialogServiceSpy: {
    confirmDelete: ReturnType<typeof vi.fn>;
    confirmAction: ReturnType<typeof vi.fn>;
    showSuccess: ReturnType<typeof vi.fn>;
    showError: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    lookupServiceSpy = {
      getAllUserRoles: vi.fn(),
      getAllUserStatuses: vi.fn(),
    };
    userServiceSpy = {
      getAllUsers: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    dialogServiceSpy = {
      confirmDelete: vi.fn(),
      confirmAction: vi.fn(),
      showSuccess: vi.fn(),
      showError: vi.fn(),
    };

    lookupServiceSpy.getAllUserRoles.mockReturnValue(of([]));
    lookupServiceSpy.getAllUserStatuses.mockReturnValue(of([]));
    userServiceSpy.getAllUsers.mockReturnValue(of([]));
    dialogServiceSpy.confirmDelete.mockReturnValue(of(true));
    dialogServiceSpy.confirmAction.mockReturnValue(of(true));

    await TestBed.configureTestingModule({
      declarations: [UserComponent],
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatGridListModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatTableModule,
        MatPaginatorModule,
      ],
      providers: [
        { provide: LookupService, useValue: lookupServiceSpy as unknown as LookupService },
        { provide: UserService, useValue: userServiceSpy as unknown as UserService },
        { provide: DialogService, useValue: dialogServiceSpy as unknown as DialogService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(UserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call delete only after confirm dialog returns true', () => {
    dialogServiceSpy.confirmDelete.mockReturnValue(of(true));
    userServiceSpy.delete.mockReturnValue(of('Deleted'));

    component.deleteUser(10);

    expect(userServiceSpy.delete).toHaveBeenCalledWith(10);
  });

  it('should not call delete when confirm dialog returns false', () => {
    dialogServiceSpy.confirmDelete.mockReturnValue(of(false));

    component.deleteUser(10);

    expect(userServiceSpy.delete).not.toHaveBeenCalled();
  });

  it('should clear fields and show a message when clear confirm returns true', () => {
    const clearSpy = vi.spyOn(component, 'clearForm');
    dialogServiceSpy.confirmAction.mockReturnValue(of(true));

    component.requestClear();

    expect(clearSpy).toHaveBeenCalled();
  });

  it('should not clear fields when clear confirm returns false', () => {
    const clearSpy = vi.spyOn(component, 'clearForm');
    component.form.markAsDirty();
    dialogServiceSpy.confirmClear = vi.fn().mockReturnValue(of(false));

    component.requestClear();

    expect(clearSpy).not.toHaveBeenCalled();
  });

  it('should filter users by username and role', () => {
    component.users = [
      {
        id: 1,
        name: 'Alice',
        email: 'alice@example.com',
        phone: '0700000001',
        role: { id: 1, name: 'Admin' },
        status: { id: 1, name: 'Active' },
      },
      {
        id: 2,
        name: 'Bob',
        email: 'bob@example.com',
        phone: '0700000002',
        role: { id: 2, name: 'User' },
        status: { id: 1, name: 'Active' },
      },
      {
        id: 3,
        name: 'Alicia',
        email: 'alicia@example.com',
        phone: '0700000003',
        role: { id: 2, name: 'User' },
        status: { id: 1, name: 'Active' },
      },
    ];
    component.dataSource.data = component.users;

    component.searchQuery = 'ali';
    component.selectedRoleId = 2;
    component.applyFilters();

    expect(component.filteredUsers.length).toBe(1);
    expect(component.filteredUsers[0].name).toBe('Alicia');
  });

  it('should reset search and show all users on search clear', () => {
    component.users = [
      {
        id: 1,
        name: 'Alice',
        email: 'alice@example.com',
        phone: '0700000001',
        role: { id: 1, name: 'Admin' },
        status: { id: 1, name: 'Active' },
      },
      {
        id: 2,
        name: 'Bob',
        email: 'bob@example.com',
        phone: '0700000002',
        role: { id: 2, name: 'User' },
        status: { id: 1, name: 'Active' },
      },
    ];
    component.dataSource.data = component.users;
    component.searchQuery = 'alice';
    component.selectedRoleId = null;
    component.applyFilters();

    component.resetFilters();

    expect(component.searchQuery).toBe('');
    expect(component.selectedRoleId).toBeNull();
    expect(component.filteredUsers.length).toBe(2);
  });

  it('should create a user with trimmed payload values', () => {
    component.form.patchValue({
      username: '  Jane User  ',
      email: '  jane@example.com  ',
      password: 'secret',
      confirmpassword: 'secret',
      phone: '  0771234567  ',
      userroles: { id: 2, name: 'User' },
      userstatuses: { id: 1, name: 'Active' },
    });
    userServiceSpy.create.mockReturnValue(of('Created'));

    component.saveUser();

    expect(userServiceSpy.create).toHaveBeenCalledWith({
      name: 'Jane User',
      email: 'jane@example.com',
      password: 'secret',
      phone: '0771234567',
      role: 'User',
      status: 'Active',
    });
  });

  it('should mark duplicate email on create conflict', () => {
    component.form.patchValue({
      username: 'Jane User',
      email: 'jane@example.com',
      password: 'secret',
      confirmpassword: 'secret',
      phone: '0771234567',
      userroles: { id: 2, name: 'User' },
      userstatuses: { id: 1, name: 'Active' },
    });
    userServiceSpy.create.mockReturnValue(throwError(() => ({ status: 409 })));

    component.saveUser();

    expect(dialogServiceSpy.showError).toHaveBeenCalledWith(
      'Registration Failed',
      'An employee with this company email already exists.'
    );
  });
});
