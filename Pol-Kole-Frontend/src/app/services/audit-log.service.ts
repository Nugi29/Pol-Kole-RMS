import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, Page } from './room.service';

export interface AuditLog {
  id: number;
  action: string;
  details: string;
  performedBy: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuditLogService {
  private readonly baseUrl = 'http://localhost:8080/api/audit-logs';

  constructor(private readonly http: HttpClient) {}

  getAuditLogs(page: number = 0, size: number = 20): Observable<Page<AuditLog>> {
    const params = { page: String(page), size: String(size) };
    return this.http.get<ApiResponse<Page<AuditLog>>>(this.baseUrl, { params }).pipe(
      map(res => res.data)
    );
  }
}
