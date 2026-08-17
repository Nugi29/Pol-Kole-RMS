import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CheckInOutService, CheckIn, CheckOut } from '../../../services/check-in-out.service';
import { HotelReservation, HotelReservationService } from '../../../services/hotel-reservation.service';
import { ReservationService } from '../../../services/reservation.service';
import { DialogService } from '../../../services/dialog.service';

export interface FrontDeskItem {
  id: number;
  type: 'ROOM' | 'TABLE';
  customerName: string;
  customerPassport: string;
  itemNumber: string; // Room number or Table number
  guestsCount: number;
  checkInDate?: string;
  checkOutDate?: string;
  reservationDate?: string;
  reservationTime?: string;
  status: string; // e.g. CONFIRMED, CHECKED_IN, etc.
}

@Component({
  selector: 'app-check-in-out',
  standalone: false,
  templateUrl: './check-in-out.component.html',
  styleUrl: './check-in-out.component.css'
})
export class CheckInOutComponent implements OnInit {
  reservations: FrontDeskItem[] = [];
  loading = false;
  successMessage = '';
  errorMessage = '';
  activeTab = 'arrivals'; // arrivals (arrivals lobby) / stays (current stays)

  constructor(
    private readonly checkInOutService: CheckInOutService,
    private readonly roomReservationService: HotelReservationService,
    private readonly tableReservationService: ReservationService,
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef,
    private readonly dialogService: DialogService
  ) {}

  ngOnInit(): void {
    this.loadReservations();
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
      this.loadReservations();
      this.cdr.markForCheck();
    });
  }

  loadReservations(): void {
    this.loading = true;
    this.errorMessage = '';
    const roomStatus = this.activeTab === 'arrivals' ? 'CONFIRMED' : 'CHECKED_IN';
    const tableStatusId = this.activeTab === 'arrivals' ? 2 : 3; // 2=Confirmed, 3=Checked In

    forkJoin({
      rooms: this.roomReservationService.filterReservations(undefined, undefined, roomStatus, undefined, undefined, 0, 1000).pipe(
        catchError(() => of({ content: [] } as any))
      ),
      tables: this.tableReservationService.filterReservations(undefined, undefined, tableStatusId, undefined, undefined, 0, 1000).pipe(
        catchError(() => of({ content: [] } as any))
      )
    }).subscribe({
      next: (results) => {
        const roomList = results.rooms?.content || [];
        const tableList = results.tables?.content || [];

        const roomItems: FrontDeskItem[] = roomList.map((res: any) => ({
          id: res.id!,
          type: 'ROOM',
          customerName: res.customerName || '',
          customerPassport: res.customerPassport || '',
          itemNumber: res.roomNumber || '',
          guestsCount: res.guestsCount,
          checkInDate: res.checkInDate,
          checkOutDate: res.checkOutDate,
          status: res.status || ''
        }));

        const tableItems: FrontDeskItem[] = tableList.map((res: any) => ({
          id: res.id!,
          type: 'TABLE',
          customerName: res.customerName || '',
          customerPassport: res.customerPassport || '',
          itemNumber: res.tableNumber || '',
          guestsCount: res.guestsCount,
          reservationDate: res.reservationDate,
          reservationTime: res.reservationTime,
          status: res.reservationStatusName || ''
        }));

        this.reservations = [...roomItems, ...tableItems];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load front desk reservations', err);
        this.errorMessage = 'Failed to load reservations.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  performCheckIn(item: FrontDeskItem): void {
    const locationType = item.type === 'ROOM' ? 'Room' : 'Table';
    this.dialogService.confirmAction('Confirm Check-In', `Check in ${item.customerName || 'guest'} to ${locationType} ${item.itemNumber}?`).subscribe((confirmed) => {
      if (confirmed) {
        this.loading = true;
        this.errorMessage = '';

        if (item.type === 'ROOM') {
          const payload: CheckIn = {
            reservationId: item.id,
            actualGuestsCount: item.guestsCount,
            notes: 'Check-in completed at front desk'
          };

          this.checkInOutService.checkIn(payload).subscribe({
            next: () => {
              this.loadReservations();
              this.dialogService.showSuccess('Check-In Complete', `Guest checked into Room ${item.itemNumber} successfully!`);
            },
            error: (err) => {
              this.errorMessage = err.error?.message || 'Failed to complete check-in.';
              this.loading = false;
              this.dialogService.showError('Check-In Failed', this.errorMessage);
            }
          });
        } else {
          this.checkInOutService.tableCheckIn(item.id).subscribe({
            next: () => {
              this.loadReservations();
              this.dialogService.showSuccess('Check-In Complete', `Guest checked into Table ${item.itemNumber} successfully!`);
            },
            error: (err) => {
              this.errorMessage = err.error?.message || 'Failed to complete check-in.';
              this.loading = false;
              this.dialogService.showError('Check-In Failed', this.errorMessage);
            }
          });
        }
      }
    });
  }

  performCheckOut(item: FrontDeskItem): void {
    const locationType = item.type === 'ROOM' ? 'Room' : 'Table';
    this.dialogService.confirmAction('Confirm Check-Out', `Check out ${item.customerName || 'guest'} from ${locationType} ${item.itemNumber}?`).subscribe((confirmed) => {
      if (confirmed) {
        this.loading = true;
        this.errorMessage = '';

        if (item.type === 'ROOM') {
          const payload: CheckOut = {
            reservationId: item.id,
            lateCheckoutFee: 0,
            notes: 'Check-out completed'
          };

          this.checkInOutService.checkOut(payload).subscribe({
            next: () => {
              this.loadReservations();
              this.dialogService.showSuccess('Check-Out Complete', `Guest checked out from Room ${item.itemNumber} successfully!`);
            },
            error: (err) => {
              this.errorMessage = err.error?.message || 'Failed to complete check-out.';
              this.loading = false;
              this.dialogService.showError('Check-Out Failed', this.errorMessage);
            }
          });
        } else {
          this.checkInOutService.tableCheckOut(item.id).subscribe({
            next: () => {
              this.loadReservations();
              this.dialogService.showSuccess('Check-Out Complete', `Guest checked out from Table ${item.itemNumber} successfully!`);
            },
            error: (err) => {
              this.errorMessage = err.error?.message || 'Failed to complete check-out.';
              this.loading = false;
              this.dialogService.showError('Check-Out Failed', this.errorMessage);
            }
          });
        }
      }
    });
  }
}
