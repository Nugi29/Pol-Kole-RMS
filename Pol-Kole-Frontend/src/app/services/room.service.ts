import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface RoomType {
  id: number;
  name: string;
  description: string;
  maxCapacity: number;
  defaultPrice: number;
  amenities: string;
}

export interface Room {
  id?: number;
  roomNumber: string;
  roomTypeId: number;
  roomTypeName?: string;
  capacity: number;
  status: string; // AVAILABLE, OCCUPIED, CLEANING, MAINTENANCE
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root',
})
export class RoomService {
  private readonly baseUrl = 'http://localhost:8080/api/rooms';

  constructor(private readonly http: HttpClient) {}

  getRoomTypes(): Observable<RoomType[]> {
    return this.http.get<ApiResponse<RoomType[]>>(`${this.baseUrl}/types`).pipe(
      map(res => res.data)
    );
  }

  createRoomType(type: any): Observable<RoomType> {
    return this.http.post<ApiResponse<RoomType>>(`${this.baseUrl}/types`, type).pipe(
      map(res => res.data)
    );
  }

  updateRoomType(id: number, type: any): Observable<RoomType> {
    return this.http.put<ApiResponse<RoomType>>(`${this.baseUrl}/types/${id}`, type).pipe(
      map(res => res.data)
    );
  }

  deleteRoomType(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/types/${id}`).pipe(
      map(() => undefined)
    );
  }

  filterRooms(status?: string, capacity?: number, page: number = 0, size: number = 10): Observable<Page<Room>> {
    let params: any = { page: String(page), size: String(size) };
    if (status) params.status = status;
    if (capacity) params.capacity = String(capacity);

    return this.http.get<ApiResponse<Page<Room>>>(this.baseUrl, { params }).pipe(
      map(res => res.data)
    );
  }

  createRoom(room: Room): Observable<Room> {
    return this.http.post<ApiResponse<Room>>(this.baseUrl, room).pipe(
      map(res => res.data)
    );
  }

  updateRoom(id: number, room: Room): Observable<Room> {
    return this.http.put<ApiResponse<Room>>(`${this.baseUrl}/${id}`, room).pipe(
      map(res => res.data)
    );
  }

  deleteRoom(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(
      map(() => undefined)
    );
  }
}
