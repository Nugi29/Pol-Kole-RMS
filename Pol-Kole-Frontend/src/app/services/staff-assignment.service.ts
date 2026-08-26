import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DailyStaffAssignment {
  id?: number;
  assignmentDate: string;
  userId: number;
  userName?: string;
  userEmail?: string;
  roleType: 'WAITER' | 'CHEF' | string;
  assignmentType: 'TABLE' | 'ROOM' | 'TAKEAWAY_ZONE' | 'KITCHEN_STATION' | string;
  tableId?: number;
  tableNumber?: string;
  tableLocation?: string;
  roomId?: number;
  roomNumber?: string;
  roomType?: string;
  zoneOrStation?: string;
  isActive?: boolean;
  notes?: string;
  onlineStatus?: string;
  lastSeen?: string;
}

export interface CallWaiterRequest {
  locationType: 'TABLE' | 'ROOM' | string;
  locationId?: number;
  locationNumber: string;
  callType: string;
  message?: string;
}

export interface CallWaiterResponse {
  success: boolean;
  message: string;
  assignedStaffId?: number;
  assignedStaffName?: string;
  assignedStaffRole?: string;
  isFallback: boolean;
  fallbackReason?: string;
  notificationId?: number;
}

@Injectable({
  providedIn: 'root',
})
export class StaffAssignmentService {
  private readonly baseUrl = 'http://localhost:8080/api/staff-assignments';

  constructor(private readonly http: HttpClient) {}

  /**
   * Get all staff assignments for date (tables, rooms, stations)
   */
  getDailyAssignments(date?: string): Observable<DailyStaffAssignment[]> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<DailyStaffAssignment[]>(this.baseUrl, { params });
  }

  /**
   * Get assignments specific to a user for date
   */
  getAssignmentsForUser(userId: number, date?: string): Observable<DailyStaffAssignment[]> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<DailyStaffAssignment[]>(`${this.baseUrl}/user/${userId}`, { params });
  }

  /**
   * One-click automated fair distribution of tables & rooms among active waiters
   */
  autoAssignWaiters(date?: string): Observable<DailyStaffAssignment[]> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.post<DailyStaffAssignment[]>(`${this.baseUrl}/auto-assign/waiters`, {}, { params });
  }

  /**
   * One-click automated distribution of kitchen stations among active chefs
   */
  autoAssignChefs(date?: string): Observable<DailyStaffAssignment[]> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.post<DailyStaffAssignment[]>(`${this.baseUrl}/auto-assign/chefs`, {}, { params });
  }

  /**
   * Save customized staff assignments
   */
  saveCustomAssignments(assignments: DailyStaffAssignment[], date?: string): Observable<DailyStaffAssignment[]> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.post<DailyStaffAssignment[]>(`${this.baseUrl}/custom`, assignments, { params });
  }

  /**
   * Customer call waiter endpoint (looks up responsible staff, checks presence, triggers fallback if offline)
   */
  callWaiter(request: CallWaiterRequest): Observable<CallWaiterResponse> {
    return this.http.post<CallWaiterResponse>(`${this.baseUrl}/call-waiter`, request);
  }
}
