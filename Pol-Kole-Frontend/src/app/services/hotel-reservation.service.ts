import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, Page } from './room.service';

export interface HotelReservation {
  id?: number;
  customerId: number;
  customerName?: string;
  customerPassport?: string;
  roomId: number;
  roomNumber?: string;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  guestsCount: number;
  status: string; // PENDING, CONFIRMED, CANCELLED, CHECKED_IN, CHECKED_OUT
}

@Injectable({
  providedIn: 'root',
})
export class HotelReservationService {
  private readonly baseUrl = 'http://localhost:8080/api/hotel-reservations';

  constructor(private readonly http: HttpClient) {}

  filterReservations(customerId?: number, roomId?: number, status?: string, startDate?: string, endDate?: string, page: number = 0, size: number = 10): Observable<Page<HotelReservation>> {
    let params: any = { page: String(page), size: String(size) };
    if (customerId) params.customerId = String(customerId);
    if (roomId) params.roomId = String(roomId);
    if (status) params.status = status;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    return this.http.get<ApiResponse<Page<HotelReservation>>>(this.baseUrl, { params }).pipe(
      map(res => res.data)
    );
  }

  createReservation(res: HotelReservation): Observable<HotelReservation> {
    return this.http.post<ApiResponse<HotelReservation>>(this.baseUrl, res).pipe(
      map(r => r.data)
    );
  }

  updateReservation(id: number, res: HotelReservation): Observable<HotelReservation> {
    return this.http.put<ApiResponse<HotelReservation>>(`${this.baseUrl}/${id}`, res).pipe(
      map(r => r.data)
    );
  }

  cancelReservation(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(
      map(() => undefined)
    );
  }
}
