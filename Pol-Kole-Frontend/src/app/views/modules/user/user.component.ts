import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { LookupService } from '../../../services/lookup.service';
import { FullUserRes, UserService } from '../../../services/user.service';

interface Employee {
  id: number;
  callingname: string;
}

interface Role {
  id: number;
  name: string;
}
interface Status {
  id: number;
  name: string;
}

interface OptionItem {
  id: number;
  name: string;
}

// interface UserRecord {
//   id: number;
//   employee: Employee | null;
//   username: string;
//   description: string;
//   roles: Role[];
//   status: OptionItem | null;
//   type: OptionItem | null;
//   createdOn: Date | null;
// }

@Component({
  selector: 'app-user',
  standalone: false,
  templateUrl: './user.component.html',
  styleUrl: './user.component.css',
})
export class UserComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  roles: Array<Role> = [];
  statuses: Array<Status> = [];
  users: Array<FullUserRes> = [];

  User: FullUserRes[] = [];

  readonly displayedColumns = [ 'name','email', 'status', 'type', 'createdOn'];
  readonly data = new MatTableDataSource<FullUserRes>([]);

  enaadd = true;
  enaupd = false;
  enadel = false;

  form!: FormGroup;
  ssearch!: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly ls: LookupService,
    private readonly us: UserService,
  ) {
    this.form = this.fb.group(
      {
        username: [''],
        email: [''],
        password: [''],
        confirmpassword: [''],
        phone: [''],
        userroles: [null as Role | null],
        userstatuses: [null as Status | null],
        updated: [{ value: new Date().toLocaleString(), disabled: true }],
      },
      { updateOn: 'change' },
    );

    this.ssearch = this.fb.group({
      ssusername: [''],
      ssrole: [null as number | null],
    });
  }

  ngOnInit(): void {
    this.ls.getAllUserRoles().subscribe((roles: Role[]) => {
      this.roles = roles;
    });
    this.ls.getAllUserStatuses().subscribe((status: Status[]) => {
      this.statuses = status;
    });
    this.loadTable();
  }

  ngAfterViewInit(): void {
    this.data.paginator = this.paginator;
  }

  loadTable(): void {
    this.us.getAllUsers().subscribe((users: FullUserRes[]) => {
      this.users = users;
      this.data.data = users;
    });
  }

  add(): void {
    // if (this.form.invalid) {
    //   this.form.markAllAsTouched();
    //   return;
    // }
    //
    // const value = this.form.getRawValue();
    // const newUser: UserRecord = {
    //   id: Date.now(),
    //   employee: value.employee,
    //   username: value.username,
    //   description: value.description,
    //   roles: value.userroles,
    //   status: value.usestatus,
    //   type: value.usetype,
    //   createdOn: value.docreated,
    // };
    //
    // this.data.data = [newUser, ...this.data.data];
    // this.clear();
  }

  update(): void {
    // if (!this.selectedrow) {
    //   return;
    // }
    //
    // const value = this.form.getRawValue();
    // this.data.data = this.data.data.map((item) =>
    //   item.id === this.selectedrow!.id
    //     ? {
    //         ...item,
    //         employee: value.employee,
    //         username: value.username,
    //         description: value.description,
    //         roles: value.userroles,
    //         status: value.usestatus,
    //         type: value.usetype,
    //         createdOn: value.docreated,
    //       }
    //     : item,
    // );
  }

  delete(): void {
    // if (!this.selectedrow) {
    //   return;
    // }
    //
    // this.data.data = this.data.data.filter((item) => item.id !== this.selectedrow!.id);
    // this.clear();
  }

  clear(): void {
    // this.form.reset({
    //   employee: null,
    //   username: '',
    //   password: '',
    //   confirmpassword: '',
    //   description: '',
    //   userroles: [],
    //   tocreated: new Date().toLocaleTimeString(),
    //   docreated: new Date(),
    //   usestatus: null,
    //   usetype: null,
    // });
    // this.selectedrow = null;
    // this.enaadd = true;
    // this.enaupd = false;
    // this.enadel = false;
  }

  btnSearchMc(): void {
    // const { ssemployee, ssusername, ssrole } = this.ssearch.getRawValue();
    //
    // this.data.filterPredicate = (row: UserRecord) => {
    //   const employeeOk =
    //     !ssemployee ||
    //     row.employee?.callingname.toLowerCase().includes(String(ssemployee).toLowerCase());
    //   const usernameOk =
    //     !ssusername || row.username.toLowerCase().includes(String(ssusername).toLowerCase());
    //   const roleOk = !ssrole || row.roles.some((role) => role.id === ssrole);
    //   return Boolean(employeeOk && usernameOk && roleOk);
    // };
    //
    // this.data.filter = `${Date.now()}`;
  }

  btnSearchClearMc(): void {
    this.ssearch.reset({ ssusername: '', ssrole: null });
    this.data.filter = '';
  }

  // fillForm(row: UserRecord): void {
    // this.selectedrow = row;
    // this.form.patchValue({
    //   employee: row.employee,
    //   username: row.username,
    //   password: '',
    //   confirmpassword: '',
    //   description: row.description,
    //   userroles: row.roles,
    //   tocreated: new Date().toLocaleTimeString(),
    //   docreated: row.createdOn,
    //   usestatus: row.status,
    //   usetype: row.type,
    // });
    //
    // this.enaadd = false;
    // this.enaupd = true;
    // this.enadel = true;
  // }

  // getRoleNames(row: UserRecord): string {
  //   return row.roles.map((item) => item.name).join(', ');
  // }
}
