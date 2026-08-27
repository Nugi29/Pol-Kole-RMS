import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface StaffNotification {
  id: number;
  recipientId: number;
  recipientName?: string;
  senderId?: number;
  senderName?: string;
  type: string;
  title: string;
  message: string;
  targetType?: string;
  targetId?: number;
  targetLabel?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string;
  status: 'UNREAD' | 'READ' | 'RESOLVED' | 'DISMISSED' | string;
  isFallback: boolean;
  fallbackNote?: string;
  createdAt: string;
  resolvedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class StaffNotificationService {
  private readonly baseUrl = 'http://localhost:8080/api/staff-notifications';

  constructor(private readonly http: HttpClient) {}

  /**
   * Get notifications for a user
   */
  getUserNotifications(userId: number, unreadOnly: boolean = false): Observable<StaffNotification[]> {
    const params = new HttpParams().set('unreadOnly', unreadOnly.toString());
    return this.http.get<StaffNotification[]>(`${this.baseUrl}/user/${userId}`, { params });
  }

  /**
   * Get count of unread notifications for a user
   */
  getUnreadCount(userId: number): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/user/${userId}/unread-count`);
  }

  /**
   * Mark a notification as read
   */
  markAsRead(notificationId: number): Observable<StaffNotification> {
    return this.http.put<StaffNotification>(`${this.baseUrl}/${notificationId}/read`, {});
  }

  /**
   * Mark a notification as resolved
   */
  resolveNotification(notificationId: number): Observable<StaffNotification> {
    return this.http.put<StaffNotification>(`${this.baseUrl}/${notificationId}/resolve`, {});
  }

  /**
   * Mark all notifications as read for a user
   */
  markAllAsRead(userId: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/user/${userId}/read-all`, {});
  }

  /**
   * Send notification manually (e.g. from manager to waiter)
   */
  sendNotification(notif: Partial<StaffNotification>): Observable<StaffNotification> {
    return this.http.post<StaffNotification>(`${this.baseUrl}/send`, notif);
  }

  /**
   * Bulk-resolve ALL unresolved notifications for a given target location across all users
   * in a single database operation. Replaces the previous N+1 loop that fetched every
   * user's notifications individually and resolved them one by one.
   */
  resolveByTarget(targetType: string | undefined, targetLabel: string | undefined, targetId?: number): Observable<{ resolvedCount: number }> {
    return this.http.put<{ resolvedCount: number }>(`${this.baseUrl}/resolve-by-target`, {
      targetType: targetType ?? null,
      targetLabel: targetLabel ?? null,
      targetId: targetId ?? null,
    });
  }
}
