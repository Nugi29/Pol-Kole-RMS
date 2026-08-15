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

@Injectable({
  providedIn: 'root'
})
export class CodeService {
  private readonly baseUrl = 'http://localhost:8080/api/codes';

  constructor(private readonly http: HttpClient) {}

  getNextRoomNumber(floor: number): Observable<string> {
    return this.http.get<ApiResponse<string>>(`${this.baseUrl}/next-room`, { params: { floor: String(floor) } }).pipe(
      map(res => res.data)
    );
  }

  getNextTableNumber(location: string): Observable<string> {
    return this.http.get<ApiResponse<string>>(`${this.baseUrl}/next-table`, { params: { location } }).pipe(
      map(res => res.data)
    );
  }

  getNextInvoiceNumber(type: string): Observable<string> {
    return this.http.get<ApiResponse<string>>(`${this.baseUrl}/next-invoice`, { params: { type } }).pipe(
      map(res => res.data)
    );
  }

  getNextCustomerCode(): Observable<string> {
    return this.http.get<ApiResponse<string>>(`${this.baseUrl}/next-customer`).pipe(
      map(res => res.data)
    );
  }
}
