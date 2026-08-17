import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { RestaurantTable, TableLocation, TableService } from '../../../services/table.service';
import { CodeService } from '../../../services/code.service';
import { DialogService } from '../../../services/dialog.service';

@Component({
  selector: 'app-tables',
  standalone: false,
  templateUrl: './tables.component.html',
  styleUrl: './tables.component.css'
})
export class TablesComponent implements OnInit {
  locationDisplayedColumns = ['name', 'code', 'status', 'actions'];
  locationDataSource = new MatTableDataSource<TableLocation>([]);

  @ViewChild('locationPaginator') set locationPaginator(mp: MatPaginator) {
    this.locationDataSource.paginator = mp;
  }

  tables: RestaurantTable[] = [];
  displayedColumns = ['tableNumber', 'capacity', 'location', 'status', 'actions'];
  dataSource = new MatTableDataSource<RestaurantTable>([]);

  form: FormGroup;
  editingId: number | null = null;
  loading = false;
  errorMessage = '';
  activeTab = 'grid';

  // Table Location Management
  locations: TableLocation[] = [];
  activeLocations: TableLocation[] = [];
  locationForm: FormGroup;
  editingLocationId: number | null = null;
  locationLoading = false;
  locationErrorMessage = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly tableService: TableService,
    private readonly route: ActivatedRoute,
    private readonly codeService: CodeService,
    private readonly cdr: ChangeDetectorRef,
    private readonly dialogService: DialogService
  ) {
    this.form = this.fb.group({
      tableNumber: [''],
      capacity: [4, [Validators.required, Validators.min(1)]],
      locationId: [null, Validators.required],
      status: ['AVAILABLE', Validators.required]
    });

    this.locationForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      code: ['', [Validators.required, Validators.maxLength(20), Validators.pattern('^[a-zA-Z0-9-]+$')]],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadLocations();
    this.loadTables();
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
      this.loadTables();
      this.loadLocations();
      this.cdr.markForCheck();
    });
  }

  loadTables(): void {
    this.loading = true;
    this.errorMessage = '';
    this.tableService.filterTables(undefined, undefined, undefined, 0, 1000).subscribe({
      next: (page) => {
        const data = page?.content || [];
        this.tables = data;
        this.dataSource.data = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load restaurant tables', err);
        this.errorMessage = 'Failed to load restaurant tables.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadLocations(): void {
    this.locationLoading = true;
    this.locationErrorMessage = '';
    this.tableService.getTableLocations().subscribe({
      next: (data) => {
        const list = data || [];
        this.locations = list;
        this.locationDataSource.data = list;
        this.activeLocations = list.filter(loc => loc.isActive);
        this.locationLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load table locations', err);
        this.locationErrorMessage = 'Failed to load table locations.';
        this.locationLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  saveTable(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.value;
    this.loading = true;
    this.errorMessage = '';

    if (this.editingId) {
      this.tableService.updateTable(this.editingId, payload).subscribe({
        next: () => {
          this.loadTables();
          this.clearForm();
          this.loading = false;
          this.dialogService.showSuccess('Table Updated', 'Table updated successfully.');
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to update table.';
          this.loading = false;
          this.dialogService.showError('Update Failed', this.errorMessage);
        }
      });
    } else {
      this.tableService.createTable(payload).subscribe({
        next: () => {
          this.loadTables();
          this.clearForm();
          this.loading = false;
          this.dialogService.showSuccess('Table Registered', 'New table registered on floor map.');
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to create table.';
          this.loading = false;
          this.dialogService.showError('Registration Failed', this.errorMessage);
        }
      });
    }
  }

  editTable(table: RestaurantTable): void {
    this.editingId = table.id || null;
    this.form.patchValue({
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      locationId: table.locationId,
      status: table.status
    });
  }

  quickStatusUpdate(table: RestaurantTable, newStatus: string): void {
    this.dialogService.confirmAction('Confirm Status Change', `Change Table ${table.tableNumber} status to ${newStatus}?`).subscribe((confirmed) => {
      if (confirmed) {
        this.loading = true;
        const payload = {
          tableNumber: table.tableNumber,
          capacity: table.capacity,
          locationId: table.locationId,
          status: newStatus
        };
        this.tableService.updateTable(table.id!, payload).subscribe({
          next: () => {
            this.loadTables();
            this.loading = false;
            this.dialogService.showSuccess('Status Updated', `Table ${table.tableNumber} status changed to ${newStatus}.`);
          },
          error: (err) => {
            this.errorMessage = 'Failed to update table status.';
            this.loading = false;
            this.dialogService.showError('Update Failed', err.error?.message || 'Failed to update table status.');
          }
        });
      }
    });
  }

  deleteTable(id: number): void {
    const table = this.tables.find(t => t.id === id);
    const tableLabel = table ? `Table ${table.tableNumber}` : 'this table';
    this.dialogService.confirmDelete(tableLabel).subscribe((confirmed) => {
      if (confirmed) {
        this.loading = true;
        this.tableService.deleteTable(id).subscribe({
          next: () => {
            this.loadTables();
            this.loading = false;
            this.dialogService.showSuccess('Deleted', `${tableLabel} was deleted successfully.`);
          },
          error: (err) => {
            this.errorMessage = 'Failed to delete table.';
            this.loading = false;
            this.dialogService.showError('Delete Failed', err.error?.message || 'Failed to delete table.');
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
          this.dialogService.showSuccess('Cleared', 'Form fields cleared successfully.');
        }
      });
    } else {
      this.clearForm();
    }
  }

  clearForm(): void {
    this.editingId = null;
    this.form.reset({
      tableNumber: '',
      capacity: 4,
      locationId: this.activeLocations.length > 0 ? this.activeLocations[0].id : null,
      status: 'AVAILABLE'
    });
  }

  getTablesCountByStatus(status: string): number {
    return this.tables.filter(t => t.status?.toUpperCase() === status.toUpperCase()).length;
  }

  getTablesCountByLocationId(locationId: number): number {
    return this.tables.filter(t => t.locationId === locationId).length;
  }

  // Location management actions
  saveLocation(): void {
    if (this.locationForm.invalid) {
      this.locationForm.markAllAsTouched();
      return;
    }
    const payload = this.locationForm.value;
    this.locationLoading = true;
    this.locationErrorMessage = '';

    if (this.editingLocationId) {
      this.tableService.updateTableLocation(this.editingLocationId, payload).subscribe({
        next: () => {
          this.loadLocations();
          this.clearLocationForm();
          this.locationLoading = false;
          this.dialogService.showSuccess('Location Updated', 'Location updated successfully.');
        },
        error: (err) => {
          this.locationErrorMessage = err.error?.message || 'Failed to update location.';
          this.locationLoading = false;
          this.dialogService.showError('Update Failed', this.locationErrorMessage);
        }
      });
    } else {
      this.tableService.createTableLocation(payload).subscribe({
        next: () => {
          this.loadLocations();
          this.clearLocationForm();
          this.locationLoading = false;
          this.dialogService.showSuccess('Location Registered', 'New location registered successfully.');
        },
        error: (err) => {
          this.locationErrorMessage = err.error?.message || 'Failed to create location.';
          this.locationLoading = false;
          this.dialogService.showError('Registration Failed', this.locationErrorMessage);
        }
      });
    }
  }

  editLocation(location: TableLocation): void {
    this.editingLocationId = location.id || null;
    this.locationForm.patchValue({
      name: location.name,
      code: location.code,
      isActive: location.isActive
    });
  }

  toggleLocationStatus(location: TableLocation): void {
    const action = location.isActive ? 'deactivate' : 'activate';
    this.dialogService.confirmAction('Confirm Status Change', `Are you sure you want to ${action} location "${location.name}"?`).subscribe((confirmed) => {
      if (confirmed) {
        const payload = { ...location, isActive: !location.isActive };
        this.tableService.updateTableLocation(location.id!, payload).subscribe({
          next: () => {
            this.loadLocations();
            this.dialogService.showSuccess('Status Updated', `Location "${location.name}" is now ${!location.isActive ? 'active' : 'inactive'}.`);
          },
          error: (err) => {
            this.locationErrorMessage = 'Failed to update location status.';
            this.dialogService.showError('Update Failed', err.error?.message || 'Failed to update location status.');
          }
        });
      }
    });
  }

  deleteLocation(id: number): void {
    const loc = this.locations.find(l => l.id === id);
    const locLabel = loc ? `Location "${loc.name}"` : 'this location';
    this.dialogService.confirmAction('Confirm Deactivation', `Are you sure you want to deactivate ${locLabel}?<br>It will be marked as inactive.`).subscribe((confirmed) => {
      if (confirmed) {
        this.locationLoading = true;
        this.tableService.deleteTableLocation(id).subscribe({
          next: () => {
            this.loadLocations();
            this.locationLoading = false;
            this.dialogService.showSuccess('Deactivated', `${locLabel} has been deactivated.`);
          },
          error: (err) => {
            this.locationErrorMessage = err.error?.message || 'Failed to delete location.';
            this.locationLoading = false;
            this.dialogService.showError('Action Failed', this.locationErrorMessage);
          }
        });
      }
    });
  }

  requestClearLocationForm(): void {
    if (this.locationForm.dirty || this.editingLocationId) {
      this.dialogService.confirmClear().subscribe((confirmed) => {
        if (confirmed) {
          this.clearLocationForm();
          this.dialogService.showSuccess('Cleared', 'Location form cleared successfully.');
        }
      });
    } else {
      this.clearLocationForm();
    }
  }

  clearLocationForm(): void {
    this.editingLocationId = null;
    this.locationForm.reset({
      name: '',
      code: '',
      isActive: true
    });
  }
}
