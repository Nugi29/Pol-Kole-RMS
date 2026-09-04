import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { CustomerDto, CustomerService } from '../../../services/customer.service';
import { DialogService } from '../../../services/dialog.service';

@Component({
  selector: 'app-customer',
  standalone: false,
  templateUrl: './customer.component.html',
  styleUrl: './customer.component.css'
})
export class CustomerComponent implements OnInit {
  private paginator: MatPaginator | null = null;
  @ViewChild(MatPaginator) set matPaginator(mp: MatPaginator) {
    this.paginator = mp;
    this.dataSource.paginator = mp;
  }

  customers: CustomerDto[] = [];
  displayedColumns = ['name', 'passport', 'phone', 'email', 'loyalty', 'actions'];
  dataSource = new MatTableDataSource<CustomerDto>([]);

  form: FormGroup;
  editingId: number | null = null;
  loading = false;
  errorMessage = '';
  searchQuery = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly customerService: CustomerService,
    private readonly dialogService: DialogService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      nicPassport: ['', [Validators.required, Validators.maxLength(50)]],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      phone: ['', [Validators.required, Validators.maxLength(20)]],
      address: [''],
      nationality: ['']
    });
  }

  ngOnInit(): void {
    this.loadCustomers();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.loading = true;
    this.errorMessage = '';
    this.customerService.searchCustomers(this.searchQuery ? this.searchQuery.trim() : undefined, 0, 1000).subscribe({
      next: (page) => {
        const data = page?.content || [];
        this.customers = data;
        this.dataSource.data = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load customers', err);
        this.errorMessage = 'Failed to load guest directory.';
        this.loading = false;
      }
    });
  }

  saveCustomer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.value;
    this.loading = true;
    this.errorMessage = '';

    if (this.editingId) {
      this.customerService.updateCustomer(this.editingId, payload).subscribe({
        next: () => {
          this.loadCustomers();
          this.clearForm();
          this.loading = false;
          this.dialogService.showSuccess('Guest Updated', 'Customer profile updated successfully.');
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to update customer profile.';
          this.loading = false;
          this.dialogService.showError('Update Failed', this.errorMessage);
        }
      });
    } else {
      this.customerService.createCustomer(payload).subscribe({
        next: () => {
          this.loadCustomers();
          this.clearForm();
          this.loading = false;
          this.dialogService.showSuccess('Guest Registered', 'New guest profile registered successfully.');
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to create customer profile.';
          this.loading = false;
          this.dialogService.showError('Registration Failed', this.errorMessage);
        }
      });
    }
  }

  editCustomer(cust: CustomerDto): void {
    this.editingId = cust.id || null;
    this.form.patchValue({
      name: cust.name,
      nicPassport: cust.nicPassport,
      email: cust.email || '',
      phone: cust.phone,
      address: cust.address || '',
      nationality: cust.nationality || ''
    });
  }

  deleteCustomer(id: number): void {
    const cust = this.customers.find(c => c.id === id);
    const custLabel = cust ? `guest profile for "${cust.name}"` : 'this customer profile';
    this.dialogService.confirmDelete(custLabel, `Are you sure you want to archive ${custLabel}?<br>Stays and billing history will be preserved in records.`).subscribe((confirmed) => {
      if (confirmed) {
        this.loading = true;
        this.customerService.deleteCustomer(id).subscribe({
          next: () => {
            this.loadCustomers();
            this.loading = false;
            this.dialogService.showSuccess('Archived', `${custLabel} was archived successfully.`);
          },
          error: () => {
            this.errorMessage = 'Failed to archive customer profile.';
            this.loading = false;
            this.dialogService.showError('Archive Failed', this.errorMessage);
          }
        });
      }
    });
  }

  requestClear(): void {
    if (this.form.dirty || this.editingId) {
      this.dialogService.confirmClear().subscribe((confirmed) => {
        if (confirmed) {
          this.clearForm();
          this.dialogService.showSuccess('Cleared', 'Guest profile form cleared successfully.');
        }
      });
    } else {
      this.clearForm();
    }
  }

  clearForm(): void {
    this.editingId = null;
    this.form.reset({
      name: '',
      nicPassport: '',
      email: '',
      phone: '',
      address: '',
      nationality: ''
    });
  }
}
