import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { RestaurantTable, TableService } from '../../../services/table.service';

@Component({
  selector: 'app-tables',
  standalone: false,
  templateUrl: './tables.component.html',
  styleUrl: './tables.component.css'
})
export class TablesComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

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

  constructor(
    private readonly fb: FormBuilder,
    private readonly tableService: TableService,
    private readonly route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      tableNumber: ['', [Validators.required, Validators.maxLength(20)]],
      capacity: [4, [Validators.required, Validators.min(1)]],
      location: ['Main Dining Hall', [Validators.required, Validators.maxLength(50)]],
      status: ['AVAILABLE', Validators.required]
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
      location: table.location,
      status: table.status
    });
  }

  quickStatusUpdate(table: RestaurantTable, newStatus: string): void {
    this.loading = true;
    const payload = { ...table, status: newStatus };
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
      location: 'Main Dining Hall',
      status: 'AVAILABLE'
    });
  }

  getTablesCountByStatus(status: string): number {
    return this.tables.filter(t => t.status === status).length;
  }
}
