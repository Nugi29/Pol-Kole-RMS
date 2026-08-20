import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
export class ReservationComponent implements OnInit, OnDestroy {
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
  shortCurrentTime = new Date().toString().slice(16, 21); //19:20
  private timerInterval: any = null;

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
      reservationDate: [new Date().toISOString().slice(0, 10), Validators.required],
      reservationTime: [this.shortCurrentTime, [Validators.required, Validators.pattern('^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$')]],
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

    // Auto-refresh guideline timeline timers every 30 seconds
    this.timerInterval = setInterval(() => {
      this.shortCurrentTime = new Date().toString().slice(16, 21);
      this.cdr.markForCheck();
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
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
    this.roomService.filterTables('AVAILABLE', undefined, undefined, 0, 1000).subscribe({
      next: (page) => {
        const data = page?.content || [];
        this.rooms = data.filter(t => t.status?.toUpperCase() === 'AVAILABLE');
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

    const bookedTableId = payload.tableId;
    this.reservationService.createReservation(payload).subscribe({
      next: () => {
        // Auto-mark table as RESERVED
        if (bookedTableId) {
          this.roomService.updateTableStatus(bookedTableId, 'RESERVED').subscribe();
        }
        this.loadReservations();
        this.loadRooms();
        this.form.reset({ guestsCount: 2 });
        this.loading = false;
        this.activeTab = 'list';
        this.dialogService.showSuccess('Booking Confirmed', 'Table reservation booked successfully. Table is marked as RESERVED.');
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
            // Auto-release table back to AVAILABLE
            if (res?.tableId) {
              this.roomService.updateTableStatus(res.tableId, 'AVAILABLE').subscribe();
            }
            this.loadReservations();
            this.loadRooms();
            this.loading = false;
            this.dialogService.showSuccess('Cancelled', `${label} has been cancelled. Table released to AVAILABLE.`);
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

  releaseTableNoShow(res: Reservation): void {
    this.dialogService.confirmAction(
      'Release Table Hold',
      `Table ${res.tableNumber} grace period has expired for booking #${res.id} (${res.customerName}). Release table back to AVAILABLE?`
    ).subscribe((confirmed) => {
      if (confirmed && res.id) {
        this.loading = true;
        this.reservationService.cancelReservation(res.id).subscribe({
          next: () => {
            if (res.tableId) {
              this.roomService.updateTableStatus(res.tableId, 'AVAILABLE').subscribe();
            }
            this.loadReservations();
            this.loadRooms();
            this.loading = false;
            this.dialogService.showSuccess('Table Released', `Table ${res.tableNumber} has been released and is now AVAILABLE.`);
          },
          error: (err) => {
            this.errorMessage = err.error?.message || 'Failed to release table.';
            this.loading = false;
            this.dialogService.showError('Release Failed', this.errorMessage);
          }
        });
      }
    });
  }

  getReservationTimeline(res: Reservation): { type: 'UPCOMING' | 'PREP' | 'HOLD' | 'EXPIRED' | 'PAST'; label: string; badgeClass: string; isExpired: boolean; prepActive: boolean } {
    if (!res.reservationDate || !res.reservationTime) {
      return { type: 'UPCOMING', label: 'Scheduled', badgeClass: 'bg-slate-100 text-slate-600', isExpired: false, prepActive: false };
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    if (res.reservationDate < todayStr) {
      return { type: 'PAST', label: 'Past Booking', badgeClass: 'bg-slate-100 text-slate-500', isExpired: false, prepActive: false };
    }
    if (res.reservationDate > todayStr) {
      return { type: 'UPCOMING', label: `Upcoming (${res.reservationDate})`, badgeClass: 'bg-indigo-50 text-indigo-600 border border-indigo-200', isExpired: false, prepActive: false };
    }

    const [h, m] = res.reservationTime.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(h, m, 0, 0);

    const diffMinutes = Math.round((target.getTime() - now.getTime()) / 60000);

    if (diffMinutes > 15) {
      const hrs = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
      return { type: 'UPCOMING', label: `Scheduled (in ${timeStr})`, badgeClass: 'bg-indigo-50 text-indigo-600 border border-indigo-200', isExpired: false, prepActive: false };
    } else if (diffMinutes <= 15 && diffMinutes >= 0) {
      return { type: 'PREP', label: `🟡 Prep Window (${diffMinutes}m to slot)`, badgeClass: 'bg-amber-50 text-amber-700 border border-amber-300 font-bold animate-pulse', isExpired: false, prepActive: true };
    } else if (diffMinutes < 0 && diffMinutes >= -20) {
      const elapsed = Math.abs(diffMinutes);
      return { type: 'HOLD', label: `🟢 Grace Hold (${20 - elapsed}m left)`, badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold', isExpired: false, prepActive: false };
    } else {
      const over = Math.abs(diffMinutes) - 20;
      return { type: 'EXPIRED', label: `🔴 Grace Expired (+${over}m)`, badgeClass: 'bg-rose-50 text-rose-700 border border-rose-300 font-bold', isExpired: true, prepActive: false };
    }
  }

  get prepCount(): number {
    return this.reservations.filter(r => this.getReservationTimeline(r).type === 'PREP').length;
  }

  get holdCount(): number {
    return this.reservations.filter(r => this.getReservationTimeline(r).type === 'HOLD').length;
  }

  get expiredCount(): number {
    return this.reservations.filter(r => this.getReservationTimeline(r).type === 'EXPIRED').length;
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
