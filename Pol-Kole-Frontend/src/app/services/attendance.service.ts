import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'ON_LEAVE';

export interface AttendanceRecord {
  id?: number;
  userId: number;
  userName?: string;
  userEmail?: string;
  roleName?: string;
  attendanceDate: string; // YYYY-MM-DD
  checkInTime?: string; // HH:mm:ss
  checkOutTime?: string; // HH:mm:ss
  status: AttendanceStatus;
  notes?: string;
  onlineStatus?: string;
  lastSeen?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActiveStaffSummary {
  date: string;
  totalStaff: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  onLeaveCount: number;
  activeWaiters: AttendanceRecord[];
  activeChefs: AttendanceRecord[];
  otherStaff: AttendanceRecord[];
}

@Injectable({
  providedIn: 'root',
})
export class AttendanceService {
  private readonly baseUrl = 'http://localhost:8080/api/attendance';

  constructor(private readonly http: HttpClient) {}

  /**
   * Mark or update attendance record for a user
   */
  markAttendance(record: Partial<AttendanceRecord>): Observable<AttendanceRecord> {
    return this.http.post<AttendanceRecord>(`${this.baseUrl}/mark`, record);
  }

  /**
   * Fast check-in for current or specific staff member
   */
  checkIn(userId: number): Observable<AttendanceRecord> {
    return this.http.post<AttendanceRecord>(`${this.baseUrl}/check-in/${userId}`, {});
  }

  /**
   * Fast check-out for staff member
   */
  checkOut(userId: number): Observable<AttendanceRecord> {
    return this.http.post<AttendanceRecord>(`${this.baseUrl}/check-out/${userId}`, {});
  }

  /**
   * Get attendance for all staff on a specific date (defaults to today)
   */
  getAttendanceByDate(date?: string): Observable<AttendanceRecord[]> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<AttendanceRecord[]>(`${this.baseUrl}/date`, { params });
  }

  /**
   * Get historical attendance records in date range
   */
  getAttendanceHistory(startDate?: string, endDate?: string): Observable<AttendanceRecord[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<AttendanceRecord[]>(`${this.baseUrl}/history`, { params });
  }

  /**
   * Get attendance history for a single user
   */
  getUserAttendanceHistory(userId: number): Observable<AttendanceRecord[]> {
    return this.http.get<AttendanceRecord[]>(`${this.baseUrl}/user/${userId}`);
  }

  /**
   * Get categorized summary of active staff for today (active waiters, active chefs, etc.)
   */
  getActiveStaffSummary(date?: string): Observable<ActiveStaffSummary> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<ActiveStaffSummary>(`${this.baseUrl}/summary`, { params });
  }

  /**
   * Get active staff by role for date
   */
  getActiveStaffByRole(role: string, date?: string): Observable<AttendanceRecord[]> {
    let params = new HttpParams().set('role', role);
    if (date) params = params.set('date', date);
    return this.http.get<AttendanceRecord[]>(`${this.baseUrl}/active-role`, { params });
  }
}
