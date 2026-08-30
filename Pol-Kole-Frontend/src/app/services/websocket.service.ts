import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, Subscription, interval, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Order } from './order.service';
import { KitchenOrder } from '../views/modules/kitchen/kitchen.component';
import { ApiResponse } from './room.service';
import { StaffNotification, StaffNotificationService } from './staff-notification.service';
import { CallWaiterResponse } from './staff-assignment.service';
import { environment } from '../../environments/environment';

export type WebSocketMessageType =
  | 'ORDER_CREATED'
  | 'ORDER_STATUS_CHANGED'
  | 'KITCHEN_STATUS_CHANGED'
  | 'GUEST_CALL'
  | 'STAFF_NOTIFICATION'
  | 'SERVICE_REQUEST_UPDATED'
  | 'BILL_REQUEST'
  | 'TABLE_UPDATED'
  | 'ROOM_UPDATED'
  | 'PRESENCE_UPDATED'
  | 'NOTIFICATION_RESOLVED'
  | 'SYNC_CONTROL'
  | 'HEARTBEAT';

export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType;
  payload: T;
  timestamp: string;
  sender?: string;
}

export type GuestCallType =
  | 'WAITER'
  | 'BILL'
  | 'WATER'
  | 'CUTLERY'
  | 'CLEANING'
  | 'RECEPTION'
  | 'HOUSEKEEPING'
  | 'TOWELS'
  | 'TOILETRIES'
  | 'ASSISTANCE'
  | 'CUSTOM';

export type ServiceRequestStatus = 'WAITING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface GuestServiceCall {
  id: string;
  locationType: 'TABLE' | 'ROOM';
  locationId?: number;
  locationNumber: string;
  callType: GuestCallType;
  message?: string;
  status: ServiceRequestStatus;
  timestamp: string;
  acceptedBy?: string;
  acceptedAt?: string;
  completedAt?: string;
  assignedStaffId?: number;
  assignedStaffName?: string;
}

@Injectable({
  providedIn: 'root',
})
export class WebsocketService implements OnDestroy {
  // Configurable endpoints
  private readonly wsUrl = environment.wsUrl;
  private readonly ordersApiUrl = `${environment.apiUrl}/orders`;
  private readonly kitchenApiUrl = `${environment.apiUrl}/kitchen`;
  private readonly presenceApiUrl = `${environment.apiUrl}/presence`;
  private readonly staffAssignmentApiUrl = `${environment.apiUrl}/staff-assignments`;
  private readonly notificationApiUrl = `${environment.apiUrl}/staff-notifications`;

  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private reconnectTimeoutId: any = null;
  private heartbeatIntervalId: any = null;
  private fallbackPollingSub: Subscription | null = null;
  private presenceHeartbeatSub: Subscription | null = null;
  private broadcastChannel: BroadcastChannel | null = null;

  // Realtime state observables
  public isConnected$ = new BehaviorSubject<boolean>(false);
  public connectionMode$ = new BehaviorSubject<'WEBSOCKET' | 'POLLING_FALLBACK'>('POLLING_FALLBACK');
  public isSyncStopped$ = new BehaviorSubject<boolean>(false);
  public messageStream$ = new Subject<WebSocketMessage>();

  // Cached state for real-time displays
  public allOrders$ = new BehaviorSubject<Order[]>([]);
  public kitchenOrders$ = new BehaviorSubject<KitchenOrder[]>([]);
  public activeGuestCalls$ = new BehaviorSubject<GuestServiceCall[]>([]);
  public staffNotifications$ = new BehaviorSubject<StaffNotification[]>([]);
  public unreadNotificationCount$ = new BehaviorSubject<number>(0);

  // Audio synthesizer context for notifications
  private audioCtx: AudioContext | null = null;

  // Set of resolved signatures (keys like 'TABLE:1', 'ROOM:101', 'notif-15', 'call-id') -> timestamp
  private resolvedCallsMap = new Map<string, number>();
  private readonly RESOLVED_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours

  // Re-entry guard: prevents overlapping concurrent poll cycles
  private isRefreshing = false;

  constructor(
    private readonly http: HttpClient,
    private readonly notifService: StaffNotificationService
  ) {
    const initialSyncStopped = typeof window !== 'undefined' && window.localStorage
      ? localStorage.getItem('pol_kole_sync_stopped') === 'true'
      : false;
    this.isSyncStopped$.next(initialSyncStopped);

    this.initResolvedCalls();
    this.initBroadcastChannel();
    this.loadPersistedCalls();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === 'pol_kole_guest_calls' || event.key === 'pol_kole_resolved_calls') {
          this.initResolvedCalls();
          this.loadPersistedCalls();
        }
        if (event.key === 'pol_kole_sync_stopped') {
          const isStopped = event.newValue === 'true';
          if (isStopped && !this.isSyncStopped$.value) {
            this.stopSync(false);
          } else if (!isStopped && this.isSyncStopped$.value) {
            this.resumeSync(false);
          }
        }
      });
    }
    if (!initialSyncStopped) {
      this.initRealtimeConnection();
      this.startFallbackPolling();
      this.startPresenceHeartbeat();
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
  }

  private initResolvedCalls(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = localStorage.getItem('pol_kole_resolved_calls');
        if (saved) {
          const parsed = JSON.parse(saved);
          const now = Date.now();
          if (typeof parsed === 'object' && parsed !== null) {
            for (const [key, ts] of Object.entries(parsed)) {
              if (typeof ts === 'number' && now - ts < this.RESOLVED_EXPIRY_MS) {
                this.resolvedCallsMap.set(key, ts);
              }
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }

  private persistResolvedCalls(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const now = Date.now();
        const obj: { [key: string]: number } = {};
        for (const [key, ts] of this.resolvedCallsMap.entries()) {
          if (now - ts < this.RESOLVED_EXPIRY_MS) {
            obj[key] = ts;
          }
        }
        localStorage.setItem('pol_kole_resolved_calls', JSON.stringify(obj));
      } catch (e) {
        // ignore
      }
    }
  }

  public markCallAsResolvedLocally(callId?: string, locationType?: string, locationNumber?: string): void {
    const now = Date.now();
    if (callId) {
      this.resolvedCallsMap.set(callId, now);
      if (callId.startsWith('notif-')) {
        this.resolvedCallsMap.set(callId.replace('notif-', ''), now);
      }
    }
    if (locationNumber) {
      const norm = this.normalizeNum(locationNumber);
      const type = (locationType || 'TABLE').toUpperCase();
      this.resolvedCallsMap.set(`${type}:${norm}`, now);
      this.resolvedCallsMap.set(`ANY:${norm}`, now);
      this.resolvedCallsMap.set(norm, now);
    }
    this.persistResolvedCalls();
  }

  public isCallResolvedLocally(callId?: string, locationType?: string, locationNumber?: string): boolean {
    const now = Date.now();
    const checkKey = (key?: string): boolean => {
      if (!key) return false;
      const ts = this.resolvedCallsMap.get(key);
      if (ts && now - ts < this.RESOLVED_EXPIRY_MS) {
        return true;
      }
      return false;
    };

    if (callId) {
      if (checkKey(callId)) return true;
      if (callId.startsWith('notif-') && checkKey(callId.replace('notif-', ''))) return true;
    }
    if (locationNumber) {
      const norm = this.normalizeNum(locationNumber);
      const type = (locationType || 'TABLE').toUpperCase();
      if (checkKey(`${type}:${norm}`)) return true;
      if (checkKey(`ANY:${norm}`)) return true;
    }
    return false;
  }

  private initBroadcastChannel(): void {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('pol_kole_rms_channel');
        this.broadcastChannel.onmessage = (event) => {
          if (event?.data) {
            this.handleIncomingMessage(event.data, false);
          }
        };
      } catch (e) {
        console.warn('[WebsocketService] BroadcastChannel init error:', e);
      }
    }
  }

  private loadPersistedCalls(): void {
    this.initResolvedCalls();
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = localStorage.getItem('pol_kole_guest_calls');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
            const activeOnly = parsed.filter((c: GuestServiceCall) => {
              if (c.status === 'COMPLETED') return false;
              if (this.isCallResolvedLocally(c.id, c.locationType, c.locationNumber)) return false;
              if (c.timestamp) {
                const callTime = new Date(c.timestamp).getTime();
                if (!isNaN(callTime) && callTime < twoHoursAgo) {
                  return false;
                }
              }
              return true;
            });
            this.activeGuestCalls$.next(activeOnly);
            this.saveCalls(activeOnly);
          }
        }
      } catch (e) {
        console.warn('[WebsocketService] Could not parse stored guest calls:', e);
      }
    }
  }

  private saveCalls(calls: GuestServiceCall[]): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem('pol_kole_guest_calls', JSON.stringify(calls));
      } catch (e) {
        // ignore
      }
    }
  }

  /**
   * Initializes native WebSocket connection
   */
  public initRealtimeConnection(): void {
    if (this.isSyncStopped$.value) {
      this.connectionMode$.next('POLLING_FALLBACK');
      return;
    }
    if (typeof window === 'undefined' || !('WebSocket' in window)) {
      this.connectionMode$.next('POLLING_FALLBACK');
      return;
    }

    try {
      this.socket = new WebSocket(this.wsUrl);

      this.socket.onopen = () => {
        this.isConnected$.next(true);
        this.connectionMode$.next('WEBSOCKET');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.refreshAllData();
      };

      this.socket.onmessage = (event: MessageEvent) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          this.handleIncomingMessage(data, true);
        } catch (e) {
          console.warn('[WebsocketService] Non-JSON WS frame:', event.data);
        }
      };

      this.socket.onclose = () => {
        this.isConnected$.next(false);
        this.connectionMode$.next('POLLING_FALLBACK');
        this.stopHeartbeat();
        if (!this.isSyncStopped$.value) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = () => {
        this.isConnected$.next(false);
        this.connectionMode$.next('POLLING_FALLBACK');
      };
    } catch (err) {
      this.connectionMode$.next('POLLING_FALLBACK');
      if (!this.isSyncStopped$.value) {
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.isSyncStopped$.value) {
      return;
    }
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
    this.reconnectAttempts++;
    clearTimeout(this.reconnectTimeoutId);
    this.reconnectTimeoutId = setTimeout(() => {
      this.initRealtimeConnection();
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatIntervalId = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.sendMessage('HEARTBEAT', { clientTime: new Date().toISOString() });
      }
    }, 25000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  private resolvingUserId = false;

  /**
   * Keep user presence alive via regular heartbeat REST calls
   */
  private startPresenceHeartbeat(): void {
    if (this.presenceHeartbeatSub) {
      this.presenceHeartbeatSub.unsubscribe();
      this.presenceHeartbeatSub = null;
    }
    if (this.isSyncStopped$.value) {
      return;
    }
    this.presenceHeartbeatSub = interval(15000).subscribe(() => {
      if (this.isSyncStopped$.value) return;
      const userId = this.getCurrentUserId();
      if (userId) {
        this.http.post(`${this.presenceApiUrl}/heartbeat/${userId}`, {}).pipe(
          catchError(() => of(null))
        ).subscribe();
      }
    });
  }

  private getCurrentUserId(): number | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      const idStr = localStorage.getItem('userId') || localStorage.getItem('id');
      if (idStr && !isNaN(Number(idStr))) {
        return Number(idStr);
      }
      const email = localStorage.getItem('email');
      if (email && !this.resolvingUserId) {
        this.resolveUserIdByEmail(email);
      }
    }
    return null;
  }

  private resolveUserIdByEmail(email: string): void {
    this.resolvingUserId = true;
    this.http.get<any>(`${environment.apiUrl}/users`).pipe(
      catchError(() => of(null))
    ).subscribe((res) => {
      this.resolvingUserId = false;
      const users = res?.data || (Array.isArray(res) ? res : []);
      if (Array.isArray(users)) {
        const found = users.find((u: any) => u.email && u.email.toLowerCase() === email.toLowerCase());
        if (found && found.id) {
          localStorage.setItem('userId', String(found.id));
          this.refreshAllData();
        }
      }
    });
  }

  /**
   * Resilient HTTP polling fallback (every 3s)
   */
  private startFallbackPolling(): void {
    if (this.fallbackPollingSub) {
      this.fallbackPollingSub.unsubscribe();
      this.fallbackPollingSub = null;
    }
    if (this.isSyncStopped$.value) {
      return;
    }
    this.refreshAllData();
    this.fallbackPollingSub = interval(3000).subscribe(() => {
      if (!this.isSyncStopped$.value) {
        this.refreshAllData();
      }
    });
  }

  public refreshAllData(): void {
    // Halts all DB requests when sync is stopped by Admin / Manager
    if (this.isSyncStopped$.value) {
      return;
    }
    // Guard against overlapping concurrent refresh cycles.
    // The 3-second polling interval can fire a new tick before the previous HTTP round-trips
    // finish, leading to race conditions and duplicate state updates.
    if (this.isRefreshing) return;
    this.isRefreshing = true;
    // 1. Fetch active orders
    this.http.get<ApiResponse<any>>(this.ordersApiUrl, { params: { page: '0', size: '200' } }).pipe(
      map(res => res?.data?.content || (Array.isArray(res?.data) ? res.data : [])),
      catchError(() => of([]))
    ).subscribe((orders: Order[]) => {
      if (orders && orders.length >= 0) {
        this.allOrders$.next(orders);
      }
    });


    // 2. Fetch active kitchen queue
    this.http.get<ApiResponse<KitchenOrder[]>>(`${this.kitchenApiUrl}/orders`).pipe(
      map(res => res?.data || []),
      catchError(() => of([]))
    ).subscribe((kOrders: KitchenOrder[]) => {
      this.kitchenOrders$.next(kOrders);
    });

    // 3. Fetch notifications for logged-in user
    const userId = this.getCurrentUserId();
    if (userId) {
      this.http.get<StaffNotification[]>(`${this.notificationApiUrl}/user/${userId}`).pipe(
        catchError(() => of([]))
      ).subscribe((notifs) => {
        if (Array.isArray(notifs)) {
          const activeNotifs = notifs.filter(n => {
            if (n.status === 'RESOLVED' || n.status === 'DISMISSED') return false;
            if (this.isCallResolvedLocally(`notif-${n.id}`, n.targetType, n.targetLabel)) {
              // Ensure DB is resolved for this notification in the background
              this.http.put(`${this.notificationApiUrl}/${n.id}/resolve`, {}).pipe(
                catchError(() => of(null))
              ).subscribe();
              return false;
            }
            return true;
          });

          const prevCount = this.unreadNotificationCount$.value;
          this.staffNotifications$.next(activeNotifs);
          const unreadNotifs = activeNotifs.filter(n => n.status === 'UNREAD');
          this.unreadNotificationCount$.next(unreadNotifs.length);

          if (unreadNotifs.length > prevCount) {
            this.playChimeSound('alert');
          }

          // Filter and merge unread notifications cleanly into activeGuestCalls stream
          let currentCalls = [...this.activeGuestCalls$.value].filter(c => {
            if (c.status === 'COMPLETED') return false;
            if (this.isCallResolvedLocally(c.id, c.locationType, c.locationNumber)) return false;
            if (c.id.startsWith('notif-')) {
              const nid = Number(c.id.replace('notif-', ''));
              return unreadNotifs.some(n => n.id === nid);
            }
            const isResolvedInNotifs = notifs.some(n =>
              (n.status === 'RESOLVED' || n.status === 'DISMISSED') &&
              n.targetLabel && c.locationNumber &&
              this.normalizeNum(n.targetLabel) === this.normalizeNum(c.locationNumber) &&
              (!n.targetType || !c.locationType || (n.targetType || '').toUpperCase() === (c.locationType || '').toUpperCase())
            );
            return !isResolvedInNotifs;
          });

          for (const n of unreadNotifs) {
            if (n.type === 'CALL_WAITER' || n.type === 'GUEST_CALL' || n.type === 'BILL_REQUEST' || n.type === 'WAITER_OFFLINE') {
              if (this.isCallResolvedLocally(`notif-${n.id}`, n.targetType, n.targetLabel)) {
                continue;
              }
              const callId = `notif-${n.id}`;
              const nNorm = this.normalizeNum(n.targetLabel);
              const exists = currentCalls.some(c =>
                c.id === callId ||
                (c.locationNumber && this.normalizeNum(c.locationNumber) === nNorm &&
                 (!n.targetType || !c.locationType || (n.targetType || '').toUpperCase() === (c.locationType || '').toUpperCase()))
              );
              if (!exists) {
                currentCalls.unshift({
                  id: callId,
                  locationType: (n.targetType as any) || 'TABLE',
                  locationId: n.targetId,
                  locationNumber: n.targetLabel || 'Table',
                  callType: 'WAITER',
                  message: n.message || n.title,
                  status: 'WAITING',
                  timestamp: n.createdAt,
                  assignedStaffId: n.recipientId,
                  assignedStaffName: n.recipientName
                });
              }
            }
          }

          this.activeGuestCalls$.next(currentCalls);
          this.saveCalls(currentCalls);
        }
      });
      // Release the re-entry guard once the notification response lands (it's the last in the chain)
      this.isRefreshing = false;
    } else {
      // No userId yet — still release the guard so polling isn't stuck
      this.isRefreshing = false;
    }
  }

  /**
   * Send a structured message over WebSocket or local broadcast
   */
  public sendMessage(type: WebSocketMessageType, payload: any): void {
    const message: WebSocketMessage = {
      type,
      payload,
      timestamp: new Date().toISOString(),
      sender: 'FRONTEND_CLIENT',
    };

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch (e) {
        // ignore
      }
    }

    this.handleIncomingMessage(message, false);
  }

  private handleIncomingMessage(msg: WebSocketMessage, shouldForwardToBroadcast = true): void {
    this.messageStream$.next(msg);

    if (shouldForwardToBroadcast && this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(msg);
      } catch (e) {
        // ignore
      }
    }

    switch (msg.type) {
      case 'SYNC_CONTROL': {
        const action = msg.payload?.action;
        if (action === 'STOP') {
          this.stopSync(false);
        } else if (action === 'RESUME') {
          this.resumeSync(false);
        }
        break;
      }

      case 'ORDER_STATUS_CHANGED':
      case 'KITCHEN_STATUS_CHANGED':
      case 'ORDER_CREATED':
        if (!this.isSyncStopped$.value) {
          this.refreshAllData();
        }
        break;

      // Backend broadcasts this event after bulk-resolving notifications so all clients
      // immediately clear matching cards without waiting for the next 3-second poll.
      case 'NOTIFICATION_RESOLVED': {
        const p = msg.payload;
        if (p) {
          const targetLabel: string | undefined = p.targetLabel;
          const targetType: string | undefined  = p.targetType;
          const notifId: number | undefined     = p.notificationId;

          // Update local notification stream
          const updatedNotifs = this.staffNotifications$.value.filter(n => {
            if (notifId && n.id === notifId) return false;
            if (targetLabel && n.targetLabel &&
                this.normalizeNum(n.targetLabel) === this.normalizeNum(targetLabel) &&
                (!targetType || !n.targetType ||
                 targetType.toUpperCase() === (n.targetType || '').toUpperCase())) {
              return false;
            }
            return true;
          });
          this.staffNotifications$.next(updatedNotifs);
          this.unreadNotificationCount$.next(updatedNotifs.filter(n => n.status === 'UNREAD').length);

          // Update guest calls stream
          if (targetLabel) {
            this.markCallAsResolvedLocally(notifId ? `notif-${notifId}` : undefined, targetType, targetLabel);
            const updatedCalls = this.activeGuestCalls$.value.filter(c => {
              if (this.isCallResolvedLocally(c.id, c.locationType, c.locationNumber)) return false;
              if (c.locationNumber &&
                  this.normalizeNum(c.locationNumber) === this.normalizeNum(targetLabel) &&
                  (!targetType || !c.locationType ||
                   targetType.toUpperCase() === (c.locationType || '').toUpperCase())) {
                return false;
              }
              return true;
            });
            this.activeGuestCalls$.next(updatedCalls);
            this.saveCalls(updatedCalls);
          }
        }
        break;
      }

      case 'STAFF_NOTIFICATION':
      case 'GUEST_CALL':
      case 'BILL_REQUEST':
        if (msg.payload) {
          if (this.isCallResolvedLocally(msg.payload.id, msg.payload.locationType, msg.payload.locationNumber)) {
            break;
          }
          const calls = this.activeGuestCalls$.value;
          const existsIndex = calls.findIndex(c => c.id === msg.payload.id);
          let updated: GuestServiceCall[];
          if (existsIndex >= 0) {
            updated = [...calls];
            updated[existsIndex] = { ...updated[existsIndex], ...msg.payload };
          } else {
            updated = [msg.payload, ...calls];
            this.playChimeSound('alert');
          }
          this.activeGuestCalls$.next(updated);
          this.saveCalls(updated);
          this.refreshAllData();
        }
        break;

      case 'SERVICE_REQUEST_UPDATED':
        if (msg.payload && msg.payload.id) {
          const payload = msg.payload;
          if (payload.status === 'COMPLETED') {
            this.markCallAsResolvedLocally(payload.id, payload.locationType, payload.locationNumber);

            // Remove matching calls completely from active calls on all windows (Admin and Waiter)
            const calls = this.activeGuestCalls$.value;
            const updatedCalls = calls.filter(c => {
              if (c.id === payload.id) return false;
              if (this.isCallResolvedLocally(c.id, c.locationType, c.locationNumber)) return false;
              if (payload.locationNumber && c.locationNumber &&
                  this.normalizeNum(payload.locationNumber) === this.normalizeNum(c.locationNumber) &&
                  (!payload.locationType || !c.locationType || (payload.locationType || '').toUpperCase() === (c.locationType || '').toUpperCase())) {
                return false;
              }
              return true;
            });
            this.activeGuestCalls$.next(updatedCalls);
            this.saveCalls(updatedCalls);

            // Real-time clear/resolve matching notifications on all windows (including Admin window) and update DB
            const currentNotifs = this.staffNotifications$.value || [];
            if (currentNotifs.length > 0) {
              const updatedNotifs = currentNotifs.map(n => {
                const matchesNotifId = payload.id === `notif-${n.id}`;
                const isLocResolved = this.isCallResolvedLocally(`notif-${n.id}`, n.targetType, n.targetLabel);
                const matchesTarget = payload.locationNumber && n.targetLabel &&
                  this.normalizeNum(payload.locationNumber) === this.normalizeNum(n.targetLabel) &&
                  (!n.targetType || !payload.locationType || (n.targetType || '').toUpperCase() === (payload.locationType || '').toUpperCase());
                if (matchesNotifId || matchesTarget || isLocResolved) {
                  this.http.put(`${this.notificationApiUrl}/${n.id}/resolve`, {}).pipe(
                    catchError(() => of(null))
                  ).subscribe();
                  return { ...n, status: 'RESOLVED' };
                }
                return n;
              });
              const activeOnly = updatedNotifs.filter(n => n.status !== 'RESOLVED' && n.status !== 'DISMISSED');
              this.staffNotifications$.next(activeOnly);
              this.unreadNotificationCount$.next(activeOnly.filter(n => n.status === 'UNREAD').length);
            }
          } else {
            // Update status (e.g. IN_PROGRESS / ACCEPTED)
            const calls = this.activeGuestCalls$.value;
            const updatedCalls = calls.map(c => {
              const isMatch = c.id === payload.id ||
                (payload.locationNumber && c.locationNumber &&
                 this.normalizeNum(payload.locationNumber) === this.normalizeNum(c.locationNumber) &&
                 (!payload.locationType || !c.locationType || (payload.locationType || '').toUpperCase() === (c.locationType || '').toUpperCase()));
              if (isMatch) {
                return { ...c, ...payload };
              }
              return c;
            });
            this.activeGuestCalls$.next(updatedCalls);
            this.saveCalls(updatedCalls);
          }
        }
        break;
    }
  }

  /**
   * Normalise a location number/label so that "Table 5", "T-5", "5" and "table5" all
   * compare as equal. Made public so components don't need to duplicate this logic.
   */
  public normalizeNum(val: any): string {
    if (!val) return '';
    return String(val).toLowerCase().replace(/table/g, '').replace(/room/g, '').replace(/t-/g, '').replace(/t/g, '').replace(/#/g, '').replace(/\s+/g, '').trim();
  }

  public disconnect(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    this.stopHeartbeat();
    if (this.fallbackPollingSub) {
      this.fallbackPollingSub.unsubscribe();
      this.fallbackPollingSub = null;
    }
    if (this.presenceHeartbeatSub) {
      this.presenceHeartbeatSub.unsubscribe();
      this.presenceHeartbeatSub = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected$.next(false);
  }

  /**
   * Helper to verify if the currently logged-in user is an Admin or Manager
   */
  public isManagerOrAdmin(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    const role = (localStorage.getItem('role') || '').toUpperCase();
    return role.includes('ADMIN') || role.includes('MANAGER');
  }

  /**
   * Stops real-time table & takeaway display sync, closing WebSocket connections,
   * cancelling reconnect timers, and terminating all background database polling & heartbeats.
   */
  public stopSync(broadcast = true): void {
    this.isSyncStopped$.next(true);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('pol_kole_sync_stopped', 'true');
    }
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    this.stopHeartbeat();
    if (this.fallbackPollingSub) {
      this.fallbackPollingSub.unsubscribe();
      this.fallbackPollingSub = null;
    }
    if (this.presenceHeartbeatSub) {
      this.presenceHeartbeatSub.unsubscribe();
      this.presenceHeartbeatSub = null;
    }
    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {}
      this.socket = null;
    }
    this.isConnected$.next(false);
    this.isRefreshing = false;

    if (broadcast) {
      this.broadcastSyncState('STOP');
    }
  }

  /**
   * Resumes real-time table & takeaway display sync, re-establishing WebSocket
   * connections and restarting background database polling streams.
   */
  public resumeSync(broadcast = true): void {
    this.isSyncStopped$.next(false);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('pol_kole_sync_stopped', 'false');
    }

    if (broadcast) {
      this.broadcastSyncState('RESUME');
    }

    this.reconnectAttempts = 0;
    this.initRealtimeConnection();
    this.startFallbackPolling();
    this.startPresenceHeartbeat();
  }

  private broadcastSyncState(action: 'STOP' | 'RESUME'): void {
    const msg: WebSocketMessage = {
      type: 'SYNC_CONTROL',
      payload: { action, timestamp: new Date().toISOString() },
      timestamp: new Date().toISOString(),
      sender: 'MANAGEMENT_CLIENT'
    };
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(msg);
      } catch (e) {}
    }
    this.messageStream$.next(msg);
  }

  // ==========================================
  // Guest Interaction & Targeted Call Waiter API
  // ==========================================

  public callWaiter(
    locationType: 'TABLE' | 'ROOM',
    locationNumber: string,
    callType: GuestCallType = 'WAITER',
    message?: string,
    locationId?: number
  ): Observable<CallWaiterResponse> {
    const payloadMsg = message || this.getDefaultCallMessage(callType);

    // Call backend targeted routing endpoint
    return this.http.post<CallWaiterResponse>(`${this.staffAssignmentApiUrl}/call-waiter`, {
      locationType,
      locationId,
      locationNumber,
      callType,
      message: payloadMsg
    }).pipe(
      map(res => {
        // Also add to local active guest calls feed
        const localCall: GuestServiceCall = {
          id: `${locationType}-${locationNumber.replace(/\s+/g, '')}-${Date.now()}`,
          locationType,
          locationId,
          locationNumber,
          callType,
          message: payloadMsg,
          status: 'WAITING',
          timestamp: new Date().toISOString(),
          assignedStaffId: res.assignedStaffId,
          assignedStaffName: res.assignedStaffName
        };

        this.sendMessage('GUEST_CALL', localCall);
        return res;
      }),
      catchError(() => {
        // Fallback local broadcast if backend call fails
        const fallbackCall: GuestServiceCall = {
          id: `${locationType}-${locationNumber.replace(/\s+/g, '')}-${Date.now()}`,
          locationType,
          locationId,
          locationNumber,
          callType,
          message: payloadMsg,
          status: 'WAITING',
          timestamp: new Date().toISOString()
        };
        this.sendMessage('GUEST_CALL', fallbackCall);
        return of({
          success: true,
          message: 'Assistance requested. Staff attending shortly.',
          isFallback: true
        } as CallWaiterResponse);
      })
    );
  }

  public updateServiceRequestStatus(
    callId: string,
    status: ServiceRequestStatus,
    staffName: string = 'Staff'
  ): void {
    const calls = this.activeGuestCalls$.value;
    const item = calls.find(c => c.id === callId);

    const payload: Partial<GuestServiceCall> = {
      id: callId,
      locationType: item?.locationType,
      locationNumber: item?.locationNumber,
      locationId: item?.locationId,
      status,
      acceptedBy: status === 'ACCEPTED' || status === 'IN_PROGRESS' ? staffName : item?.acceptedBy,
      acceptedAt: status === 'ACCEPTED' || status === 'IN_PROGRESS' ? new Date().toISOString() : item?.acceptedAt,
      completedAt: status === 'COMPLETED' ? new Date().toISOString() : item?.completedAt,
    };

    if (status === 'COMPLETED') {
      this.markCallAsResolvedLocally(callId, item?.locationType, item?.locationNumber);
    }

    this.sendMessage('SERVICE_REQUEST_UPDATED', payload);

    if (status === 'COMPLETED') {
      const updated = calls.filter(c => {
        if (c.id === callId) return false;
        if (this.isCallResolvedLocally(c.id, c.locationType, c.locationNumber)) return false;
        if (item?.locationNumber && c.locationNumber &&
            this.normalizeNum(item.locationNumber) === this.normalizeNum(c.locationNumber) &&
            (!item.locationType || !c.locationType || (item.locationType || '').toUpperCase() === (c.locationType || '').toUpperCase())) {
          return false;
        }
        return true;
      });
      this.activeGuestCalls$.next(updated);
      this.saveCalls(updated);
    }

    // Find and resolve/mark as read any matching staff notifications in backend and local stream
    const notifs = this.staffNotifications$.value || [];
    const matchingNotifs = notifs.filter(n => {
      if (callId === `notif-${n.id}`) return true;
      if (this.isCallResolvedLocally(`notif-${n.id}`, n.targetType, n.targetLabel)) return true;
      if (item?.locationNumber && n.targetLabel && this.normalizeNum(item.locationNumber) === this.normalizeNum(n.targetLabel)) {
        if (!n.targetType || (n.targetType || '').toUpperCase() === (item.locationType || '').toUpperCase()) {
          return true;
        }
      }
      return false;
    });

    for (const n of matchingNotifs) {
      const endpoint = status === 'COMPLETED' ? 'resolve' : 'read';
      this.http.put(`${this.notificationApiUrl}/${n.id}/${endpoint}`, {}).pipe(
        catchError(() => of(null))
      ).subscribe();
    }

    if (status === 'COMPLETED') {
      this.resolveAllStaffNotificationsForTarget(item?.locationType, item?.locationNumber, item?.locationId);
    }

    if (matchingNotifs.length > 0) {
      const updatedNotifs = notifs.map(n => {
        if (matchingNotifs.some(m => m.id === n.id)) {
          return { ...n, status: status === 'COMPLETED' ? 'RESOLVED' : 'READ' };
        }
        return n;
      });
      const activeOnly = updatedNotifs.filter(n => n.status !== 'RESOLVED' && n.status !== 'DISMISSED');
      this.staffNotifications$.next(activeOnly);
      this.unreadNotificationCount$.next(activeOnly.filter(n => n.status === 'UNREAD').length);
    }
  }

  public resolveGuestCall(callOrId: any): void {
    const callId = typeof callOrId === 'string' ? callOrId : callOrId?.id;
    const locationNumber = typeof callOrId === 'object' ? callOrId?.locationNumber : undefined;
    const locationType = typeof callOrId === 'object' ? callOrId?.locationType : undefined;
    const locationId = typeof callOrId === 'object' ? callOrId?.locationId : undefined;

    const calls = this.activeGuestCalls$.value;
    const item = calls.find(c =>
      (callId && c.id === callId) ||
      (locationNumber && c.locationNumber && this.normalizeNum(c.locationNumber) === this.normalizeNum(locationNumber))
    );

    const finalId = callId || item?.id || `call-${Date.now()}`;
    const finalLocNum = locationNumber || item?.locationNumber;
    const finalLocType = locationType || item?.locationType;
    const finalLocId = locationId || item?.locationId;

    // 1. Mark as locally resolved
    this.markCallAsResolvedLocally(finalId, finalLocType, finalLocNum);

    const payload: Partial<GuestServiceCall> = {
      id: finalId,
      locationType: finalLocType,
      locationNumber: finalLocNum,
      locationId: finalLocId,
      status: 'COMPLETED',
      completedAt: new Date().toISOString()
    };

    // 2. Broadcast resolution to all open tabs and WebSocket
    this.sendMessage('SERVICE_REQUEST_UPDATED', payload);

    // 3. Remove from activeGuestCalls locally & in storage
    const updated = calls.filter(c => {
      if (finalId && c.id === finalId) return false;
      if (this.isCallResolvedLocally(c.id, c.locationType, c.locationNumber)) return false;
      if (finalLocNum && c.locationNumber &&
          this.normalizeNum(finalLocNum) === this.normalizeNum(c.locationNumber) &&
          (!finalLocType || !c.locationType || (finalLocType || '').toUpperCase() === (c.locationType || '').toUpperCase())) {
        return false;
      }
      return true;
    });
    this.activeGuestCalls$.next(updated);
    this.saveCalls(updated);

    // 4. Resolve matching notifications in DB — the bulk endpoint handles ALL users at once
    // (including the current user, Admins, Managers, etc). No need for individual PUT calls.
    this.resolveAllStaffNotificationsForTarget(finalLocType, finalLocNum, finalLocId);

    // 5. Optimistically clear matching notifications from the local stream immediately
    //    without waiting for the backend round-trip (backend WebSocket event will confirm it)
    const notifs = this.staffNotifications$.value || [];
    const activeOnly = notifs.filter(n => {
      if (finalId === `notif-${n.id}`) return false;
      if (finalLocNum && n.targetLabel &&
          this.normalizeNum(finalLocNum) === this.normalizeNum(n.targetLabel) &&
          (!finalLocType || !n.targetType ||
           finalLocType.toUpperCase() === (n.targetType || '').toUpperCase())) {
        return false;
      }
      return n.status !== 'RESOLVED' && n.status !== 'DISMISSED';
    });
    this.staffNotifications$.next(activeOnly);
    this.unreadNotificationCount$.next(activeOnly.filter(n => n.status === 'UNREAD').length);
  }


  /**
   * Bulk-resolve all notifications for a target location across ALL users in ONE HTTP call.
   *
   * Previously this was an N+1 loop: fetch all users → for each user fetch their notifications
   * → for each match PUT /resolve. On a team of 10 with 5 active notifications that was 60+
   * HTTP requests per completion click. Now it's a single PUT that runs one UPDATE query.
   *
   * The backend also broadcasts a NOTIFICATION_RESOLVED WebSocket event so every connected
   * client clears their local state immediately without waiting for the next poll.
   */
  private resolveAllStaffNotificationsForTarget(targetType?: string, targetLabel?: string, targetId?: number): void {
    if (!targetLabel && !targetId) return;

    this.notifService.resolveByTarget(targetType, targetLabel, targetId).pipe(
      catchError((err) => {
        console.warn('[WebsocketService] resolveByTarget failed:', err);
        return of({ resolvedCount: 0 });
      })
    ).subscribe(res => {
      if (res.resolvedCount > 0) {
        console.debug(`[WebsocketService] Bulk-resolved ${res.resolvedCount} notification(s) for`, targetType, targetLabel);
      }
    });
  }

  private getDefaultCallMessage(type: GuestCallType): string {
    switch (type) {
      case 'BILL': return 'Guest requested final invoice & bill';
      case 'WATER': return 'Guest requested fresh ice water refill';
      case 'CUTLERY': return 'Guest requested extra cutlery and plates';
      case 'CLEANING': return 'Guest requested table cleaning / tidying';
      case 'HOUSEKEEPING': return 'Guest requested housekeeping service';
      case 'TOWELS': return 'Guest requested fresh towels';
      case 'TOILETRIES': return 'Guest requested hotel amenities / toiletries';
      case 'RECEPTION': return 'Guest requested reception assistance';
      case 'ASSISTANCE': return 'Guest requested staff assistance';
      default: return 'Guest requested waiter assistance';
    }
  }

  // ==========================================
  // Synthesized Web Audio Chimes
  // ==========================================

  public playChimeSound(type: 'ready' | 'alert' | 'ding' = 'ready'): void {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtxClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      if (type === 'ready') {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, index) => {
          const osc = this.audioCtx!.createOscillator();
          const gain = this.audioCtx!.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + index * 0.14);

          gain.gain.setValueAtTime(0, now + index * 0.14);
          gain.gain.linearRampToValueAtTime(0.18, now + index * 0.14 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.14 + 0.45);

          osc.connect(gain);
          gain.connect(this.audioCtx!.destination);

          osc.start(now + index * 0.14);
          osc.stop(now + index * 0.14 + 0.48);
        });
      } else if (type === 'alert') {
        [600, 800].forEach((freq, idx) => {
          const osc = this.audioCtx!.createOscillator();
          const gain = this.audioCtx!.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.15);

          gain.gain.setValueAtTime(0, now + idx * 0.15);
          gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.15 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.3);

          osc.connect(gain);
          gain.connect(this.audioCtx!.destination);

          osc.start(now + idx * 0.15);
          osc.stop(now + idx * 0.15 + 0.35);
        });
      } else {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch (e) {
      console.warn('[WebsocketService] Audio chime playback bypassed:', e);
    }
  }
}
