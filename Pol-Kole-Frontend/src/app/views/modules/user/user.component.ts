import { AfterViewInit, Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';

import { LookupRes, LookupService } from '../../../services/lookup.service';
import { FullUserRes, UserService } from '../../../services/user.service';
import { ConfirmComponent } from '../../../shared/dialog/confirm/confirm.component';
import { MessageComponent } from '../../../shared/dialog/message/message.component';
import { compareById } from '../../../shared/utils/ui-utils';
import {
  createUserSearchFilter,
  matchesUserSearch,
  toCreateUserPayload,
  toUpdateUserPayload,
  UserFormValue,
} from './user.helpers';

@Component({
  selector: 'app-user',
  standalone: false,
  templateUrl: './user.component.html',
  styleUrl: './user.component.css',
})
export class UserComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  gridCols = 12;
  formColSpan = 5;
  formRowSpan = 6;
  searchColSpan = 7;
  searchRowSpan = 2;
  tableColSpan = 7;
  tableRowSpan = 4;

  roles: LookupRes[] = [];
  statuses: LookupRes[] = [];
  users: FullUserRes[] = [];

  readonly displayedColumns = ['name', 'email', 'status', 'type', 'createdOn'];
  readonly data = new MatTableDataSource<FullUserRes>([]);
  readonly compareLookupById = compareById;

  canAdd = true;
  canUpdate = false;
  canDelete = false;
  selectedRow: FullUserRes | null = null;

  form: FormGroup;
  searchForm: FormGroup;

  private readonly dialogWidth = '420px';

  constructor(
    private readonly fb: FormBuilder,
    private readonly ls: LookupService,
    private readonly us: UserService,
    private readonly dialog: MatDialog,
  ) {
    this.form = this.fb.group(
      {
        username: [''],
        email: [''],
        password: [''],
        confirmpassword: [''],
        phone: [''],
        userroles: [null as LookupRes | null],
        userstatuses: [null as LookupRes | null],
        updated: [{ value: new Date().toLocaleString(), disabled: true }],
      },
      { updateOn: 'change' },
    );

    this.searchForm = this.fb.group({
      ssusername: [''],
      ssrole: [null as number | null],
    });

    this.form.get('email')?.valueChanges.subscribe(() => {
      this.clearDuplicateEmailError();
    });

    this.data.filterPredicate = (row: FullUserRes, filter: string): boolean => matchesUserSearch(row, filter);
  }

  ngOnInit(): void {
    this.syncLayout(window.innerWidth);
    this.loadLookups();
    this.loadTable();
  }

  ngAfterViewInit(): void {
    this.data.paginator = this.paginator;
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize(event: Event): void {
    const target = event.target as Window;
    this.syncLayout(target.innerWidth);
  }

  private loadLookups(): void {
    this.ls.getAllUserRoles().subscribe((roles: LookupRes[]) => {
      this.roles = roles;
    });

    this.ls.getAllUserStatuses().subscribe((status: LookupRes[]) => {
      this.statuses = status;
    });
  }

  loadTable(): void {
    this.us.getAllUsers().subscribe((users: FullUserRes[]) => {
      this.users = users;
      this.data.data = users;
    });
  }

  add(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = toCreateUserPayload(this.form.getRawValue() as UserFormValue);
    this.us.create(payload).subscribe({
      next: () => {
        this.loadTable();
        this.clear();
        this.showMessage('Success', 'User created successfully.');
      },
      error: (error) => {
        if (error?.status === 409) {
          this.setDuplicateEmailError();
          this.showMessage('Duplicate Email', 'A user with this email already exists.');
          return;
        }

        console.error('Failed to create user', error);
        this.showMessage('Create Failed', 'Unable to create the user right now. Please try again.');
      },
    });
  }

  enableButtons(add: boolean, upd: boolean, del: boolean): void {
    this.canAdd = add;
    this.canUpdate = upd;
    this.canDelete = del;
  }

  update(): void {
    if (!this.selectedRow) {
      return;
    }

    const selectedId = this.selectedRow.id;
    const selectedName = this.selectedRow.name;
    const payload = toUpdateUserPayload(this.form.getRawValue() as UserFormValue, selectedId);

    this.us.update(selectedId, payload).subscribe({
      next: () => {
        this.loadTable();
        this.clear();
        this.showMessage('Success', `User "${selectedName}" updated successfully.`);
      },
      error: (error) => {
        if (error?.status === 409) {
          this.setDuplicateEmailError();
          this.showMessage('Duplicate Email', 'A user with this email already exists.');
          return;
        }

        console.error('Failed to update user', error);
        this.showMessage('Update Failed', 'Unable to update the user right now. Please try again.');
      },
    });
  }

  delete(): void {
    if (!this.selectedRow) {
      return;
    }

    const selectedId = this.selectedRow.id;
    const selectedName = this.selectedRow.name;

    this.confirmAction('Confirm Delete', `Are you sure you want to delete "${selectedName}"?<br>This action cannot be undone.`)
      .subscribe((confirmed: boolean) => {
        if (confirmed) {
          this.deleteConfirmed(selectedId, selectedName);
        }
      });
  }

  private deleteConfirmed(selectedId: number, selectedName: string): void {
    this.us.delete(selectedId).subscribe({
      next: () => {
        this.loadTable();
        this.clear();
        this.showMessage('Deleted', `User "${selectedName}" deleted successfully.`);
      },
      error: (error) => {
        console.error('Failed to delete user', error);
        this.showMessage('Delete Failed', 'Unable to delete the user right now. Please try again.');
      },
    });
  }

  requestClear(): void {
    this.confirmAction('Confirm Clear', 'Do you want to clear all form fields?<br>Unsaved changes will be lost.').subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.clear();
        this.showMessage('Cleared', 'Form fields cleared successfully.');
      }
    });
  }

  clear(): void {
    this.form.reset({
      username: '',
      email: '',
      password: '',
      confirmpassword: '',
      phone: '',
      userroles: null,
      userstatuses: null,
      updated: this.now(),
    });
    this.clearDuplicateEmailError();
    this.selectedRow = null;
    this.enableButtons(true, false, false);
  }

  fillForm(row: FullUserRes): void {
    this.selectedRow = row;
    const selectedRole = this.roles.find((item) => item.id === row.role?.id) ?? row.role;
    const selectedStatus = this.statuses.find((item) => item.id === row.status?.id) ?? row.status;

    this.form.patchValue({
      username: row.name,
      email: row.email,
      password: '',
      confirmpassword: '',
      phone: row.phone,
      userroles: selectedRole,
      userstatuses: selectedStatus,
      updated: this.now(),
    });
    this.enableButtons(false, true, true);
   }

  private setDuplicateEmailError(): void {
    const emailControl = this.form.get('email');
    if (!emailControl) {
      return;
    }

    emailControl.setErrors(
      emailControl.errors ? { ...emailControl.errors, duplicateEmail: true } : { duplicateEmail: true },
    );
    emailControl.markAsTouched();
  }

  private clearDuplicateEmailError(): void {
    const emailControl = this.form.get('email');
    if (!emailControl?.errors?.['duplicateEmail']) {
      return;
    }

    const { duplicateEmail, ...otherErrors } = emailControl.errors;
    emailControl.setErrors(Object.keys(otherErrors).length ? otherErrors : null);
  }

  private showMessage(heading: string, message: string): void {
    this.dialog.open(MessageComponent, {
      width: this.dialogWidth,
      data: { heading, message },
    });
  }

  btnSearchMc(): void {
    this.data.filter = createUserSearchFilter(this.searchForm.getRawValue());
    this.paginator?.firstPage();
  }

  btnSearchClearMc(): void {
    this.searchForm.reset({ ssusername: '', ssrole: null });
    this.data.filter = '';
    this.data.data = this.users;
    this.paginator?.firstPage();
  }

  private confirmAction(heading: string, message: string) {
    return this.dialog.open(ConfirmComponent, {
      width: this.dialogWidth,
      data: { heading, message },
    }).afterClosed();
  }

  private now(): string {
    return new Date().toLocaleString();
  }

  private syncLayout(width: number): void {
    if (width < 900) {
      this.applyCompactLayout();
      return;
    }

    this.applyDesktopLayout();
  }

  private applyCompactLayout(): void {
    this.gridCols = 1;
    this.formColSpan = 1;
    this.formRowSpan = 4;
    this.searchColSpan = 1;
    this.searchRowSpan = 1;
    this.tableColSpan = 1;
    this.tableRowSpan = 3;
  }

  private applyDesktopLayout(): void {
    this.gridCols = 12;
    this.formColSpan = 5;
    this.formRowSpan = 6;
    this.searchColSpan = 7;
    this.searchRowSpan = 2;
    this.tableColSpan = 7;
    this.tableRowSpan = 4;
  }

}
