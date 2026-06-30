import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CheckInOutService, CheckIn, CheckOut } from '../../../services/check-in-out.service';
import { HotelReservation, HotelReservationService } from '../../../services/hotel-reservation.service';

@Component({
  selector: 'app-check-in-out',
  standalone: false,
  templateUrl: './check-in-out.component.html',
  styleUrl: './check-in-out.component.css'
})
export class CheckInOutComponent implements OnInit {
  reservations: HotelReservation[] = [];
  loading = false;
  successMessage = '';
  errorMessage = '';
  activeTab = 'arrivals'; // arrivals (CONFIRMED -> ready to check in) / stays (CHECKED_IN -> ready to check out)

  constructor(
    private readonly checkInOutService: CheckInOutService,
    private readonly reservationService: HotelReservationService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadReservations();
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
    });
  }

  loadReservations(): void {
    this.loading = true;
    const statusFilter = this.activeTab === 'arrivals' ? 'CONFIRMED' : 'CHECKED_IN';
    this.reservationService.filterReservations(undefined, undefined, statusFilter).subscribe({
      next: (page) => {
        this.reservations = page.content;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load reservations.';
        this.loading = false;
      }
    });
  }

  performCheckIn(resId: number, guestsCount: number): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload: CheckIn = {
      reservationId: resId,
      actualGuestsCount: guestsCount,
      notes: 'Check-in completed at front desk'
    };

    this.checkInOutService.checkIn(payload).subscribe({
      next: () => {
        this.successMessage = `Guest checked in successfully!`;
        this.loadReservations();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to complete check-in.';
        this.loading = false;
      }
    });
  }

  performCheckOut(resId: number): void {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload: CheckOut = {
      reservationId: resId,
      lateCheckoutFee: 0,
      notes: 'Check-out completed'
    };

    this.checkInOutService.checkOut(payload).subscribe({
      next: () => {
        this.successMessage = `Guest checked out successfully!`;
        this.loadReservations();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to complete check-out.';
        this.loading = false;
      }
    });
  }
}
