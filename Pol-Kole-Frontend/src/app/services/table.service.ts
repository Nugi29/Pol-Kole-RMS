import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, Page } from './room.service';

export interface TableLocation {
  id?: number;
  name: string;
  code: string;
  isActive: boolean;
}

export interface RestaurantTable {
  id?: number;
  tableNumber?: string;
  capacity: number;
  status: string; // AVAILABLE, RESERVED, OCCUPIED, CLEANING
  locationId: number;
  locationName?: string;
  locationCode?: string;
  isAvailableForReservation?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class TableService {
  private readonly baseUrl = 'http://localhost:8080/api/tables';
  private readonly locationUrl = 'http://localhost:8080/api/table-locations';

  constructor(private readonly http: HttpClient) {}

  filterTables(status?: string, location?: string, capacity?: number, page: number = 0, size: number = 10): Observable<Page<RestaurantTable>> {
    let params: any = { page: String(page), size: String(size) };
    if (status) params.status = status;
    if (location) params.location = location;
    if (capacity) params.capacity = String(capacity);

    return this.http.get<ApiResponse<Page<RestaurantTable>>>(this.baseUrl, { params }).pipe(
      map(res => res.data)
    );
  }

  createTable(table: RestaurantTable): Observable<RestaurantTable> {
    return this.http.post<ApiResponse<RestaurantTable>>(this.baseUrl, table).pipe(
      map(res => res.data)
    );
  }

  updateTable(id: number, table: RestaurantTable): Observable<RestaurantTable> {
    return this.http.put<ApiResponse<RestaurantTable>>(`${this.baseUrl}/${id}`, table).pipe(
      map(res => res.data)
    );
  }

  deleteTable(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(
      map(() => undefined)
    );
  }

  // Location APIs
  getTableLocations(): Observable<TableLocation[]> {
    return this.http.get<ApiResponse<TableLocation[]>>(this.locationUrl).pipe(
      map(res => res.data)
    );
  }

  createTableLocation(location: TableLocation): Observable<TableLocation> {
    return this.http.post<ApiResponse<TableLocation>>(this.locationUrl, location).pipe(
      map(res => res.data)
    );
  }

  updateTableLocation(id: number, location: TableLocation): Observable<TableLocation> {
    return this.http.put<ApiResponse<TableLocation>>(`${this.locationUrl}/${id}`, location).pipe(
      map(res => res.data)
    );
  }

  deleteTableLocation(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.locationUrl}/${id}`).pipe(
      map(() => undefined)
    );
  }
}
