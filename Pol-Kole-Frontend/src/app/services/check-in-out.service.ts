import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from './room.service';
import { environment } from '../../environments/environment';

export interface CheckIn {
  id?: number;
  reservationId: number;
  roomNumber?: string;
  customerName?: string;
  checkInTime?: string;
  actualGuestsCount: number;
  notes?: string;
}

export interface CheckOut {
  id?: number;
  reservationId: number;
  roomNumber?: string;
  customerName?: string;
  checkOutTime?: string;
  lateCheckoutFee?: number;
  notes?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CheckInOutService {
  private readonly baseUrl = `${environment.apiUrl}/check-in-out`;

  constructor(private readonly http: HttpClient) {}

  checkIn(checkIn: CheckIn): Observable<CheckIn> {
    return this.http.post<ApiResponse<CheckIn>>(`${this.baseUrl}/check-in`, checkIn).pipe(
      map(res => res.data)
    );
  }

  checkOut(checkOut: CheckOut): Observable<CheckOut> {
    return this.http.post<ApiResponse<CheckOut>>(`${this.baseUrl}/check-out`, checkOut).pipe(
      map(res => res.data)
    );
  }

  tableCheckIn(reservationId: number): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/table-check-in/${reservationId}`, {}).pipe(
      map(() => undefined)
    );
  }

  tableCheckOut(reservationId: number): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/table-check-out/${reservationId}`, {}).pipe(
      map(() => undefined)
    );
  }

  getCheckInByReservation(reservationId: number): Observable<CheckIn> {
    return this.http.get<ApiResponse<CheckIn>>(`${this.baseUrl}/check-in/${reservationId}`).pipe(
      map(res => res.data)
    );
  }

  getCheckOutByReservation(reservationId: number): Observable<CheckOut> {
    return this.http.get<ApiResponse<CheckOut>>(`${this.baseUrl}/check-out/${reservationId}`).pipe(
      map(res => res.data)
    );
  }
}
