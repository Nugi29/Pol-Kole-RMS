import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, Page } from './room.service';
import { environment } from '../../environments/environment';

export interface Reservation {
  id?: number;
  customerId: number;
  customerName?: string;
  customerPassport?: string;
  tableId: number;
  tableNumber?: string;
  reservationDate: string; // YYYY-MM-DD
  reservationTime: string; // HH:MM
  guestsCount: number;
  specialRequests?: string;
  reservationStatusId?: number;
  reservationStatusName?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReservationService {
  private readonly baseUrl = `${environment.apiUrl}/reservations`;

  constructor(private readonly http: HttpClient) {}

  filterReservations(customerId?: number, tableId?: number, statusId?: number, startDate?: string, endDate?: string, page: number = 0, size: number = 10): Observable<Page<Reservation>> {
    let params: any = { page: String(page), size: String(size) };
    if (customerId) params.customerId = String(customerId);
    if (tableId) params.tableId = String(tableId);
    if (statusId) params.statusId = String(statusId);
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    return this.http.get<ApiResponse<Page<Reservation>>>(this.baseUrl, { params }).pipe(
      map(res => res.data)
    );
  }

  createReservation(res: Reservation): Observable<Reservation> {
    return this.http.post<ApiResponse<Reservation>>(this.baseUrl, res).pipe(
      map(r => r.data)
    );
  }

  updateReservation(id: number, res: Reservation): Observable<Reservation> {
    return this.http.put<ApiResponse<Reservation>>(`${this.baseUrl}/${id}`, res).pipe(
      map(r => r.data)
    );
  }

  cancelReservation(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(
      map(() => undefined)
    );
  }

  getReservationById(id: number): Observable<Reservation> {
    return this.http.get<ApiResponse<Reservation>>(`${this.baseUrl}/${id}`).pipe(
      map(res => res.data)
    );
  }

  getReservationsByCustomerId(customerId: number): Observable<Reservation[]> {
    return this.http.get<ApiResponse<Reservation[]>>(`${this.baseUrl}/customer/${customerId}`).pipe(
      map(res => res.data)
    );
  }
}
