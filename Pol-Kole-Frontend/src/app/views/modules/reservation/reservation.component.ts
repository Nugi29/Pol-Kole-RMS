import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { Reservation, ReservationService } from '../../../services/reservation.service';
import { RestaurantTable, TableService } from '../../../services/table.service';
import { CustomerDto, CustomerService } from '../../../services/customer.service';
import { Room, RoomService } from '../../../services/room.service';
import { HotelReservation, HotelReservationService } from '../../../services/hotel-reservation.service';
import { DialogService } from '../../../services/dialog.service';

@Component({
  selector: 'app-reservation',
  standalone: false,
  templateUrl: './reservation.component.html',
  styleUrl: './reservation.component.css'
})
export class ReservationComponent implements OnInit {
  @ViewChild('diningPaginator') set diningPaginator(mp: MatPaginator) {
    this.dataSource.paginator = mp;
  }

  @ViewChild('hotelPaginator') set hotelPaginator(mp: MatPaginator) {
    this.hotelDataSource.paginator = mp;
  }

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
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef,
    private readonly dialogService: DialogService
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
    this.loadAll();
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
      this.loadAll();
      this.cdr.markForCheck();
    });
  }

  loadAll(): void {
    this.loadReservations();
    this.loadRooms();
    this.loadCustomers();
    this.loadHotelReservations();
    this.loadHotelRooms();
  }

  loadReservations(): void {
    this.loading = true;
    this.errorMessage = '';
    this.reservationService.filterReservations(undefined, undefined, undefined, undefined, undefined, 0, 1000).subscribe({
      next: (page) => {
        const data = page?.content || [];
        this.reservations = data;
        this.dataSource.data = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load reservations', err);
        this.errorMessage = 'Failed to load table reservations ledger.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadRooms(): void {
    this.roomService.filterTables(undefined, undefined, undefined, 0, 1000).subscribe({
      next: (page) => {
        this.rooms = page?.content || [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.rooms = [];
        this.cdr.markForCheck();
      }
    });
  }

  loadCustomers(): void {
    this.customerService.searchCustomers(undefined, 0, 1000).subscribe({
      next: (page) => {
        this.customers = page?.content || [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.customers = [];
        this.cdr.markForCheck();
      }
    });
  }

  loadHotelReservations(): void {
    this.loading = true;
    this.errorMessage = '';
    this.hotelReservationService.filterReservations(undefined, undefined, undefined, undefined, undefined, 0, 1000).subscribe({
      next: (page) => {
        const data = page?.content || [];
        this.hotelReservations = data;
        this.hotelDataSource.data = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load hotel reservations', err);
        this.errorMessage = 'Failed to load hotel room reservations ledger.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadHotelRooms(): void {
    this.hotelRoomService.filterRooms(undefined, undefined, 0, 1000).subscribe({
      next: (page) => {
        const data = page?.content || [];
        this.hotelRooms = data.filter(r => r.status?.toUpperCase() === 'AVAILABLE');
        this.cdr.markForCheck();
      },
      error: () => {
        this.hotelRooms = [];
        this.cdr.markForCheck();
      }
    });
  }

  createBooking(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Please fill out all required fields with valid values.';
      this.dialogService.showError('Validation Error', this.errorMessage);
      return;
    }

    const payload = this.form.value;
    this.loading = true;
    this.errorMessage = '';

    this.reservationService.createReservation(payload).subscribe({
      next: () => {
        this.loadReservations();
        this.form.reset({ guestsCount: 2 });
        this.loading = false;
        this.activeTab = 'list';
        this.dialogService.showSuccess('Booking Confirmed', 'Table reservation booked successfully.');
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to place reservation. Verify table availability and slot.';
        this.loading = false;
        this.dialogService.showError('Booking Failed', this.errorMessage);
      }
    });
  }

  cancelBooking(id: number): void {
    const res = this.reservations.find(r => r.id === id);
    const label = res ? `table booking #${id} for "${res.customerName}"` : `booking #${id}`;
    this.dialogService.confirmAction('Confirm Cancellation', `Are you sure you want to cancel ${label}?`).subscribe((confirmed) => {
      if (confirmed) {
        this.loading = true;
        this.reservationService.cancelReservation(id).subscribe({
          next: () => {
            this.loadReservations();
            this.loading = false;
            this.dialogService.showSuccess('Cancelled', `${label} has been cancelled.`);
          },
          error: (err) => {
            this.errorMessage = err.error?.message || 'Failed to cancel reservation.';
            this.loading = false;
            this.dialogService.showError('Cancellation Failed', this.errorMessage);
          }
        });
      }
    });
  }

  createHotelBooking(): void {
    if (this.hotelReservationForm.invalid) {
      this.hotelReservationForm.markAllAsTouched();
      this.errorMessage = 'Please fill out all required fields with valid values.';
      this.dialogService.showError('Validation Error', this.errorMessage);
      return;
    }

    const payload = this.hotelReservationForm.value;
    payload.status = 'CONFIRMED';
    this.loading = true;
    this.errorMessage = '';

    this.hotelReservationService.createReservation(payload).subscribe({
      next: () => {
        this.loadHotelReservations();
        this.loadHotelRooms();
        this.hotelReservationForm.reset({ guestsCount: 1 });
        this.loading = false;
        this.activeTab = 'listRooms';
        this.dialogService.showSuccess('Room Booking Confirmed', 'Hotel room reservation booked successfully.');
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to place room reservation. Verify room availability.';
        this.loading = false;
        this.dialogService.showError('Booking Failed', this.errorMessage);
      }
    });
  }

  cancelHotelBooking(id: number): void {
    const res = this.hotelReservations.find(r => r.id === id);
    const label = res ? `room reservation #${id} for "${res.customerName}" (Room ${res.roomNumber})` : `room reservation #${id}`;
    this.dialogService.confirmAction('Confirm Cancellation', `Are you sure you want to cancel ${label}?`).subscribe((confirmed) => {
      if (confirmed) {
        this.loading = true;
        this.hotelReservationService.cancelReservation(id).subscribe({
          next: () => {
            this.loadHotelReservations();
            this.loadHotelRooms();
            this.loading = false;
            this.dialogService.showSuccess('Cancelled', `${label} has been cancelled.`);
          },
          error: (err) => {
            this.errorMessage = err.error?.message || 'Failed to cancel room reservation.';
            this.loading = false;
            this.dialogService.showError('Cancellation Failed', this.errorMessage);
          }
        });
      }
    });
  }
}
