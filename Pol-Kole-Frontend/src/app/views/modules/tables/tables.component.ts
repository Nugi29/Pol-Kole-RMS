import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { RestaurantTable, TableLocation, TableService } from '../../../services/table.service';
import { CodeService } from '../../../services/code.service';

@Component({
  selector: 'app-tables',
  standalone: false,
  templateUrl: './tables.component.html',
  styleUrl: './tables.component.css'
})
export class TablesComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  locationDisplayedColumns = ['name', 'code', 'status', 'actions'];
  locationDataSource = new MatTableDataSource<TableLocation>([]);

  @ViewChild('locationPaginator') set locationPaginator(mp: MatPaginator) {
    this.locationDataSource.paginator = mp;
  }

  private readonly refresh$ = new BehaviorSubject<void>(undefined);
  tables$: Observable<RestaurantTable[]>;

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
    private readonly codeService: CodeService
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

    this.tables$ = this.refresh$.pipe(
      tap(() => this.loading = true),
      switchMap(() => this.tableService.filterTables()),
      map(page => page.content),
      tap({
        next: (data) => {
          this.tables = data;
          this.dataSource.data = data;
          if (this.paginator) {
            this.dataSource.paginator = this.paginator;
          }
          this.loading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to load restaurant tables.';
          this.loading = false;
        }
      })
    );
  }

  ngOnInit(): void {
    this.loadLocations();
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
      this.loadTables();
    });

    // Activate the reactive stream subscription
    this.tables$.subscribe();
  }

  loadTables(): void {
    this.refresh$.next();
  }

  loadLocations(): void {
    this.locationLoading = true;
    this.tableService.getTableLocations().subscribe({
      next: (data) => {
        this.locations = data;
        this.locationDataSource.data = data;
        this.activeLocations = data.filter(loc => loc.isActive);
        this.locationLoading = false;
      },
      error: () => {
        this.locationErrorMessage = 'Failed to load table locations.';
        this.locationLoading = false;
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
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to update table.';
          this.loading = false;
        }
      });
    } else {
      this.tableService.createTable(payload).subscribe({
        next: () => {
          this.loadTables();
          this.clearForm();
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to create table.';
          this.loading = false;
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
      },
      error: () => {
        this.errorMessage = 'Failed to update table status.';
        this.loading = false;
      }
    });
  }

  deleteTable(id: number): void {
    if (confirm('Are you sure you want to delete this table?')) {
      this.loading = true;
      this.tableService.deleteTable(id).subscribe({
        next: () => {
          this.loadTables();
          this.loading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to delete table.';
          this.loading = false;
        }
      });
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
        },
        error: (err) => {
          this.locationErrorMessage = err.error?.message || 'Failed to update location.';
          this.locationLoading = false;
        }
      });
    } else {
      this.tableService.createTableLocation(payload).subscribe({
        next: () => {
          this.loadLocations();
          this.clearLocationForm();
          this.locationLoading = false;
        },
        error: (err) => {
          this.locationErrorMessage = err.error?.message || 'Failed to create location.';
          this.locationLoading = false;
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
    const payload = { ...location, isActive: !location.isActive };
    this.tableService.updateTableLocation(location.id!, payload).subscribe({
      next: () => {
        this.loadLocations();
      },
      error: () => {
        this.locationErrorMessage = 'Failed to update location status.';
      }
    });
  }

  deleteLocation(id: number): void {
    if (confirm('Are you sure you want to soft delete this location? It will be marked as inactive.')) {
      this.locationLoading = true;
      this.tableService.deleteTableLocation(id).subscribe({
        next: () => {
          this.loadLocations();
          this.locationLoading = false;
        },
        error: (err) => {
          this.locationErrorMessage = err.error?.message || 'Failed to delete location.';
          this.locationLoading = false;
        }
      });
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
