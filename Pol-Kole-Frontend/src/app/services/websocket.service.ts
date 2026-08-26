import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, Subscription, interval, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Order } from './order.service';
import { KitchenOrder } from '../views/modules/kitchen/kitchen.component';
import { ApiResponse } from './room.service';

export type WebSocketMessageType =
  | 'ORDER_CREATED'
  | 'ORDER_STATUS_CHANGED'
  | 'KITCHEN_STATUS_CHANGED'
  | 'GUEST_CALL'
  | 'SERVICE_REQUEST_UPDATED'
  | 'BILL_REQUEST'
  | 'TABLE_UPDATED'
  | 'ROOM_UPDATED'
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
}

@Injectable({
  providedIn: 'root',
})
export class WebsocketService implements OnDestroy {
  // Configurable WS endpoint
  private readonly wsUrl = 'ws://localhost:8080/ws/orders';
  private readonly ordersApiUrl = 'http://localhost:8080/api/orders';
  private readonly kitchenApiUrl = 'http://localhost:8080/api/kitchen';

  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private reconnectTimeoutId: any = null;
  private heartbeatIntervalId: any = null;
  private fallbackPollingSub: Subscription | null = null;
  private broadcastChannel: BroadcastChannel | null = null;

  // Realtime state observables
  public isConnected$ = new BehaviorSubject<boolean>(false);
  public connectionMode$ = new BehaviorSubject<'WEBSOCKET' | 'POLLING_FALLBACK'>('POLLING_FALLBACK');
  public messageStream$ = new Subject<WebSocketMessage>();

  // Cached state for real-time displays
  public allOrders$ = new BehaviorSubject<Order[]>([]);
  public kitchenOrders$ = new BehaviorSubject<KitchenOrder[]>([]);
  public activeGuestCalls$ = new BehaviorSubject<GuestServiceCall[]>([]);

  // Audio synthesizer context for notifications
  private audioCtx: AudioContext | null = null;

  constructor(private readonly http: HttpClient) {
    this.initBroadcastChannel();
    this.loadPersistedCalls();
    this.initRealtimeConnection();
    this.startFallbackPolling();
  }

  ngOnDestroy(): void {
    this.disconnect();
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
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
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = localStorage.getItem('pol_kole_guest_calls');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Keep only uncompleted or today's calls
            const activeOnly = parsed.filter((c: GuestServiceCall) => c.status !== 'COMPLETED');
            this.activeGuestCalls$.next(activeOnly);
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
   * Initializes the native WebSocket connection
   */
  public initRealtimeConnection(): void {
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
          console.warn('[WebsocketService] Received non-JSON WebSocket frame:', event.data);
        }
      };

      this.socket.onclose = (event) => {
        this.isConnected$.next(false);
        this.connectionMode$.next('POLLING_FALLBACK');
        this.stopHeartbeat();
        this.scheduleReconnect();
      };

      this.socket.onerror = (err) => {
        this.isConnected$.next(false);
        this.connectionMode$.next('POLLING_FALLBACK');
      };
    } catch (err) {
      this.connectionMode$.next('POLLING_FALLBACK');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
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

  /**
   * Resilient HTTP polling fallback (running every 4 seconds) to guarantee real-time updates
   */
  private startFallbackPolling(): void {
    this.refreshAllData();
    this.fallbackPollingSub = interval(4000).subscribe(() => {
      this.refreshAllData();
    });
  }

  public refreshAllData(): void {
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

    // Also trigger locally so active subscribers reflect change instantly
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
      case 'ORDER_STATUS_CHANGED':
      case 'KITCHEN_STATUS_CHANGED':
      case 'ORDER_CREATED':
        this.refreshAllData();
        break;

      case 'GUEST_CALL':
      case 'BILL_REQUEST':
        if (msg.payload) {
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
        }
        break;

      case 'SERVICE_REQUEST_UPDATED':
        if (msg.payload && msg.payload.id) {
          const calls = this.activeGuestCalls$.value;
          const existsIndex = calls.findIndex(c => c.id === msg.payload.id);
          if (existsIndex >= 0) {
            const updated = [...calls];
            updated[existsIndex] = { ...updated[existsIndex], ...msg.payload };
            this.activeGuestCalls$.next(updated);
            this.saveCalls(updated);
          }
        }
        break;
    }
  }

  public disconnect(): void {
    if (this.reconnectTimeoutId) clearTimeout(this.reconnectTimeoutId);
    this.stopHeartbeat();
    if (this.fallbackPollingSub) this.fallbackPollingSub.unsubscribe();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected$.next(false);
  }

  // ==========================================
  // Guest Interaction API
  // ==========================================

  public callWaiter(
    locationType: 'TABLE' | 'ROOM',
    locationNumber: string,
    callType: GuestCallType = 'WAITER',
    message?: string,
    locationId?: number
  ): GuestServiceCall {
    const callPayload: GuestServiceCall = {
      id: `${locationType}-${locationNumber.replace(/\s+/g, '')}-${Date.now()}`,
      locationType,
      locationId,
      locationNumber,
      callType,
      message: message || this.getDefaultCallMessage(callType),
      status: 'WAITING',
      timestamp: new Date().toISOString()
    };

    this.sendMessage('GUEST_CALL', callPayload);
    return callPayload;
  }

  public updateServiceRequestStatus(
    callId: string,
    status: ServiceRequestStatus,
    staffName: string = 'Staff'
  ): void {
    const calls = this.activeGuestCalls$.value;
    const item = calls.find(c => c.id === callId);
    if (!item) return;

    const payload: Partial<GuestServiceCall> = {
      id: callId,
      status,
      acceptedBy: status === 'ACCEPTED' || status === 'IN_PROGRESS' ? staffName : item.acceptedBy,
      acceptedAt: status === 'ACCEPTED' ? new Date().toISOString() : item.acceptedAt,
      completedAt: status === 'COMPLETED' ? new Date().toISOString() : item.completedAt,
    };

    this.sendMessage('SERVICE_REQUEST_UPDATED', payload);
  }

  public resolveGuestCall(callId: string): void {
    this.updateServiceRequestStatus(callId, 'COMPLETED');
    const updated = this.activeGuestCalls$.value.filter(c => c.id !== callId);
    this.activeGuestCalls$.next(updated);
    this.saveCalls(updated);
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
  // Synthesized Web Audio Alerts (No MP3 files needed)
  // ==========================================

  /**
   * Plays a pleasant synthesized melodic chime for order status ready and guest alerts
   */
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
        // Luxury 3-tone ascending chime (C5 -> E5 -> G5)
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
        // Double ding for guest assistance call
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
        // Simple subtle ding
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
