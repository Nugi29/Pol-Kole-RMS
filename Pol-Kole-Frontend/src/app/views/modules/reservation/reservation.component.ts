import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { Reservation, ReservationService } from '../../../services/reservation.service';
import { RestaurantTable, TableService } from '../../../services/table.service';
import { CustomerDto, CustomerService } from '../../../services/customer.service';

@Component({
  selector: 'app-reservation',
  standalone: false,
  templateUrl: './reservation.component.html',
  styleUrl: './reservation.component.css'
})
export class ReservationComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  reservations: Reservation[] = [];
  rooms: RestaurantTable[] = [];
  customers: CustomerDto[] = [];
  displayedColumns = ['id', 'customer', 'table', 'date', 'time', 'guestsCount', 'status', 'actions'];
  dataSource = new MatTableDataSource<Reservation>([]);

  form: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';
  activeTab = 'new';

  constructor(
    private readonly fb: FormBuilder,
    private readonly reservationService: ReservationService,
    private readonly roomService: TableService,
    private readonly customerService: CustomerService,
    private readonly route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      customerId: [null, Validators.required],
      tableId: [null, Validators.required],
      reservationDate: ['', Validators.required],
      reservationTime: ['', [Validators.required, Validators.pattern('^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$')]],
      guestsCount: [2, [Validators.required, Validators.min(1)]],
      specialRequests: ['']
    });
  }

  ngOnInit(): void {
    this.loadReservations();
    this.loadRooms();
    this.loadCustomers();
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
    });
  }

  loadReservations(): void {
    this.loading = true;
    this.reservationService.filterReservations().subscribe({
      next: (page) => {
        this.reservations = page.content;
        this.dataSource.data = page.content;
        if (this.paginator) {
          this.dataSource.paginator = this.paginator;
        }
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load reservations.';
        this.loading = false;
      }
    });
  }

  loadRooms(): void {
    this.roomService.filterTables().subscribe(page => {
      this.rooms = page.content;
    });
  }

  loadCustomers(): void {
    this.customerService.searchCustomers(undefined, 0, 100).subscribe(page => {
      this.customers = page.content;
    });
  }

  createBooking(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.value;
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.reservationService.createReservation(payload).subscribe({
      next: () => {
        this.successMessage = 'Table Reservation booked successfully.';
        this.loadReservations();
        this.form.reset({ guestsCount: 2 });
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to place reservation. Verify table availability and slot.';
        this.loading = false;
      }
    });
  }

  cancelBooking(id: number): void {
    if (confirm('Are you sure you want to cancel this reservation?')) {
      this.loading = true;
      this.reservationService.cancelReservation(id).subscribe({
        next: () => {
          this.loadReservations();
          this.loading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to cancel reservation.';
          this.loading = false;
        }
      });
    }
  }
}
