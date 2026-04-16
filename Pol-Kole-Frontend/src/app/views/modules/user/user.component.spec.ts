import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
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
import { LookupService } from '../../../services/lookup.service';
import { UserService } from '../../../services/user.service';
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
  let dialogSpy: {
    open: ReturnType<typeof vi.fn>;
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
    dialogSpy = {
      open: vi.fn(),
    };

    lookupServiceSpy.getAllUserRoles.mockReturnValue(of([]));
    lookupServiceSpy.getAllUserStatuses.mockReturnValue(of([]));
    userServiceSpy.getAllUsers.mockReturnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [UserComponent],
      imports: [
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
        { provide: MatDialog, useValue: dialogSpy as unknown as MatDialog },
      ],
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
    component.selectedRow = {
      id: 10,
      name: 'Test User',
      email: 'test@example.com',
      phone: '0770000000',
      role: { id: 1, name: 'Admin' },
      status: { id: 1, name: 'Active' },
    };

    dialogSpy.open.mockImplementation((dialogComponent: unknown) => {
      if (dialogComponent === ConfirmComponent) {
        return { afterClosed: () => of(true) } as any;
      }
      return {} as any;
    });
    userServiceSpy.delete.mockReturnValue(of('Deleted'));

    component.delete();

    expect(userServiceSpy.delete).toHaveBeenCalledWith(10);
  });

  it('should not call delete when confirm dialog returns false', () => {
    component.selectedRow = {
      id: 10,
      name: 'Test User',
      email: 'test@example.com',
      phone: '0770000000',
      role: { id: 1, name: 'Admin' },
      status: { id: 1, name: 'Active' },
    };

    dialogSpy.open.mockReturnValue({ afterClosed: () => of(false) } as any);

    component.delete();

    expect(userServiceSpy.delete).not.toHaveBeenCalled();
  });

  it('should clear fields and show a message when clear confirm returns true', () => {
    const clearSpy = vi.spyOn(component, 'clear');

    dialogSpy.open.mockImplementation((dialogComponent: unknown) => {
      if (dialogComponent === ConfirmComponent) {
        return { afterClosed: () => of(true) } as any;
      }
      return {} as any;
    });

    component.requestClear();

    expect(clearSpy).toHaveBeenCalled();
    const openedComponents = dialogSpy.open.mock.calls.map((call) => call[0]);
    expect(openedComponents).toContain(ConfirmComponent);
    expect(openedComponents).toContain(MessageComponent);
  });

  it('should not clear fields when clear confirm returns false', () => {
    const clearSpy = vi.spyOn(component, 'clear');

    dialogSpy.open.mockReturnValue({ afterClosed: () => of(false) } as any);

    component.requestClear();

    expect(clearSpy).not.toHaveBeenCalled();
    const openedComponents = dialogSpy.open.mock.calls.map((call) => call[0]);
    expect(openedComponents).toContain(ConfirmComponent);
    expect(openedComponents).not.toContain(MessageComponent);
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
    component.data.data = component.users;

    component.searchForm.patchValue({ ssusername: 'ali', ssrole: 2 });
    component.btnSearchMc();

    expect(component.data.filteredData.length).toBe(1);
    expect(component.data.filteredData[0].name).toBe('Alicia');
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
    component.data.data = component.users;
    component.searchForm.patchValue({ ssusername: 'alice', ssrole: null });
    component.btnSearchMc();

    component.btnSearchClearMc();

    expect(component.searchForm.getRawValue()).toEqual({ ssusername: '', ssrole: null });
    expect(component.data.filter).toBe('');
    expect(component.data.data.length).toBe(2);
  });

  it('should create a user with trimmed payload values', () => {
    component.form.patchValue({
      username: '  Jane User  ',
      email: '  jane@example.com  ',
      password: '  secret  ',
      confirmpassword: 'secret',
      phone: '  0771234567  ',
      userroles: { id: 2, name: 'User' },
      userstatuses: { id: 1, name: 'Active' },
    });
    userServiceSpy.create.mockReturnValue(of('Created'));

    component.add();

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

    component.add();

    expect(component.form.get('email')?.hasError('duplicateEmail')).toBe(true);
    expect(dialogSpy.open).toHaveBeenCalledWith(
      MessageComponent,
      expect.objectContaining({
        data: expect.objectContaining({
          heading: 'Duplicate Email',
        }),
      }),
    );
  });
});
