import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { Reservation, ReservationService } from '../../../services/reservation.service';
import { RestaurantTable, TableService } from '../../../services/table.service';
import { CustomerDto, CustomerService } from '../../../services/customer.service';
import { Room, RoomService } from '../../../services/room.service';
import { HotelReservation, HotelReservationService } from '../../../services/hotel-reservation.service';

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

  // Hotel Stays Reservations
  hotelReservations: HotelReservation[] = [];
  hotelRooms: Room[] = [];
  hotelReservationForm: FormGroup;
  hotelDataSource = new MatTableDataSource<HotelReservation>([]);
  hotelDisplayedColumns = ['id', 'customer', 'room', 'checkInDate', 'checkOutDate', 'guestsCount', 'status', 'actions'];

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
    private readonly hotelRoomService: RoomService,
    private readonly hotelReservationService: HotelReservationService,
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

    this.hotelReservationForm = this.fb.group({
      customerId: [null, Validators.required],
      roomId: [null, Validators.required],
      checkInDate: ['', Validators.required],
      checkOutDate: ['', Validators.required],
      guestsCount: [1, [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    this.loadReservations();
    this.loadRooms();
    this.loadCustomers();
    this.loadHotelReservations();
    this.loadHotelRooms();
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
        this.errorMessage = 'Failed to load table reservations ledger.';
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

  loadHotelReservations(): void {
    this.loading = true;
    this.hotelReservationService.filterReservations(undefined, undefined, undefined, undefined, undefined, 0, 100).subscribe({
      next: (page) => {
        this.hotelReservations = page.content;
        this.hotelDataSource.data = page.content;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load hotel room reservations ledger.';
        this.loading = false;
      }
    });
  }

  loadHotelRooms(): void {
    this.hotelRoomService.filterRooms(undefined, undefined, 0, 100).subscribe(page => {
      this.hotelRooms = page.content.filter(r => r.status?.toUpperCase() === 'AVAILABLE');
    });
  }

  createBooking(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Please fill out all required fields with valid values.';
      console.warn('Form validation failed:', this.form.controls);
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
        this.activeTab = 'list';
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to place reservation. Verify table availability and slot.';
        this.loading = false;
      }
    });
  }

  cancelBooking(id: number): void {
    if (confirm('Are you sure you want to cancel this booking?')) {
      this.loading = true;
      this.reservationService.cancelReservation(id).subscribe({
        next: () => {
          this.successMessage = 'Booking cancelled successfully.';
          this.loadReservations();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to cancel reservation.';
          this.loading = false;
        }
      });
    }
  }

  createHotelBooking(): void {
    if (this.hotelReservationForm.invalid) {
      this.hotelReservationForm.markAllAsTouched();
      this.errorMessage = 'Please fill out all required fields with valid values.';
      return;
    }

    const payload = this.hotelReservationForm.value;
    payload.status = 'CONFIRMED';
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.hotelReservationService.createReservation(payload).subscribe({
      next: () => {
        this.successMessage = 'Hotel Room Reservation booked successfully.';
        this.loadHotelReservations();
        this.loadHotelRooms();
        this.hotelReservationForm.reset({ guestsCount: 1 });
        this.loading = false;
        this.activeTab = 'listRooms';
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to place room reservation. Verify room availability.';
        this.loading = false;
      }
    });
  }

  cancelHotelBooking(id: number): void {
    if (confirm('Are you sure you want to cancel this room reservation?')) {
      this.loading = true;
      this.hotelReservationService.cancelReservation(id).subscribe({
        next: () => {
          this.successMessage = 'Hotel Room reservation cancelled successfully.';
          this.loadHotelReservations();
          this.loadHotelRooms();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to cancel room reservation.';
          this.loading = false;
        }
      });
    }
  }
}
