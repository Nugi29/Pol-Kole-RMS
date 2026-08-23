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

export interface GuestServiceCall {
  id?: string;
  locationType: 'TABLE' | 'ROOM';
  locationNumber: string;
  callType: 'WAITER' | 'BILL' | 'WATER' | 'CLEANING' | 'CUSTOM';
  message?: string;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'COMPLETED';
  timestamp: string;
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
    this.initRealtimeConnection();
    this.startFallbackPolling();
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  /**
   * Initializes the native WebSocket connection
   */
  public initRealtimeConnection(): void {
    if (typeof window === 'undefined' || !('WebSocket' in window)) {
      console.warn('[WebsocketService] WebSockets not supported in this environment. Falling back to HTTP polling.');
      this.connectionMode$.next('POLLING_FALLBACK');
      return;
    }

    try {
      this.socket = new WebSocket(this.wsUrl);

      this.socket.onopen = () => {
        console.log('[WebsocketService] Connected to Real-time WebSocket server.');
        this.isConnected$.next(true);
        this.connectionMode$.next('WEBSOCKET');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.refreshAllData();
      };

      this.socket.onmessage = (event: MessageEvent) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          this.handleIncomingMessage(data);
        } catch (e) {
          console.warn('[WebsocketService] Received non-JSON WebSocket frame:', event.data);
        }
      };

      this.socket.onclose = (event) => {
        console.warn('[WebsocketService] WebSocket closed:', event.reason || 'Normal/Server shutdown');
        this.isConnected$.next(false);
        this.connectionMode$.next('POLLING_FALLBACK');
        this.stopHeartbeat();
        this.scheduleReconnect();
      };

      this.socket.onerror = (err) => {
        console.warn('[WebsocketService] WebSocket connection error (backend might be using HTTP or offline):', err);
        this.isConnected$.next(false);
        this.connectionMode$.next('POLLING_FALLBACK');
      };
    } catch (err) {
      console.warn('[WebsocketService] Could not establish WebSocket connection. Active polling will maintain real-time UI.', err);
      this.connectionMode$.next('POLLING_FALLBACK');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WebsocketService] Max reconnect attempts reached. Continuing in resilient HTTP Polling mode.');
      return;
    }

    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
    this.reconnectAttempts++;
    clearTimeout(this.reconnectTimeoutId);
    this.reconnectTimeoutId = setTimeout(() => {
      console.log(`[WebsocketService] Attempting WebSocket reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
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
   * even if the backend WebSocket endpoint is unavailable or transitioning.
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

    // Also trigger locally so active subscribers reflect change instantly
    this.handleIncomingMessage(message);
  }

  private handleIncomingMessage(msg: WebSocketMessage): void {
    this.messageStream$.next(msg);

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
          const exists = calls.some(c => c.id === msg.payload.id);
          if (!exists) {
            this.activeGuestCalls$.next([msg.payload, ...calls]);
            this.playChimeSound('alert');
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

  public callWaiter(locationType: 'TABLE' | 'ROOM', locationNumber: string, callType: 'WAITER' | 'BILL' | 'WATER' | 'CLEANING' | 'CUSTOM' = 'WAITER', message?: string): void {
    const callPayload: GuestServiceCall = {
      id: `${locationType}-${locationNumber}-${Date.now()}`,
      locationType,
      locationNumber,
      callType,
      message: message || (callType === 'BILL' ? 'Guest requested bill/invoice' : callType === 'WATER' ? 'Guest requested complimentary water' : 'Guest requested waiter assistance'),
      status: 'PENDING',
      timestamp: new Date().toISOString()
    };

    this.sendMessage('GUEST_CALL', callPayload);
  }

  public resolveGuestCall(callId: string): void {
    const updated = this.activeGuestCalls$.value.filter(c => c.id !== callId);
    this.activeGuestCalls$.next(updated);
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
