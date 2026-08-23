import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { WebsocketService } from '../../../../services/websocket.service';
import { Order, OrderService } from '../../../../services/order.service';
import { KitchenOrder } from '../../kitchen/kitchen.component';

export interface TakeawayTicket {
  orderId: number;
  customerName: string;
  itemsSummary: string;
  itemCount: number;
  status: 'PREPARING' | 'READY' | 'COMPLETED';
  orderTime: string;
  isRecentlyReady?: boolean;
}

@Component({
  selector: 'app-takeaway-display',
  standalone: false,
  templateUrl: './takeaway-display.component.html',
  styleUrls: ['./takeaway-display.component.css']
})
export class TakeawayDisplayComponent implements OnInit, OnDestroy {
  currentTime = new Date();
  isMuted = false;
  isFullscreen = false;
  connectionMode: 'WEBSOCKET' | 'POLLING_FALLBACK' = 'POLLING_FALLBACK';
  isConnected = false;
  filterMode: 'TAKEAWAY' | 'ALL' = 'ALL'; // 'ALL' ensures all unserved tokens show up

  preparingOrders: TakeawayTicket[] = [];
  readyOrders: TakeawayTicket[] = [];
  recentCompleted: TakeawayTicket[] = [];

  private previousReadyIds = new Set<number>();
  private clockSub: Subscription | null = null;
  private wsSub: Subscription | null = null;
  private ordersSub: Subscription | null = null;
  private kitchenSub: Subscription | null = null;

  constructor(
    public readonly wsService: WebsocketService,
    private readonly orderService: OrderService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // 1. Clock interval
    this.clockSub = interval(1000).subscribe(() => {
      this.currentTime = new Date();
      this.cdr.markForCheck();
    });

    // 2. Connection status
    this.wsSub = this.wsService.connectionMode$.subscribe(mode => {
      this.connectionMode = mode;
      this.isConnected = mode === 'WEBSOCKET' ? this.wsService.isConnected$.value : true;
      this.cdr.markForCheck();
    });

    // 3. Listen to all orders stream
    this.ordersSub = this.wsService.allOrders$.subscribe(allOrders => {
      const kitchenOrders = this.wsService.kitchenOrders$.value || [];
      this.processTakeawayOrders(allOrders, kitchenOrders);
    });

    // 4. Listen to kitchen tickets stream
    this.kitchenSub = this.wsService.kitchenOrders$.subscribe(kitchenOrders => {
      const allOrders = this.wsService.allOrders$.value || [];
      this.processTakeawayOrders(allOrders, kitchenOrders);
    });

    // 5. Direct HTTP load as robust fallback
    this.orderService.filterOrders(undefined, undefined, undefined, 0, 1000).subscribe({
      next: (page) => {
        const orders = page?.content || [];
        if (orders.length > 0) {
          this.wsService.allOrders$.next(orders);
          const kOrders = this.wsService.kitchenOrders$.value || [];
          this.processTakeawayOrders(orders, kOrders);
        }
      },
      error: (err) => console.warn('Direct order load fallback error', err)
    });

    this.wsService.refreshAllData();
  }

  ngOnDestroy(): void {
    if (this.clockSub) this.clockSub.unsubscribe();
    if (this.wsSub) this.wsSub.unsubscribe();
    if (this.ordersSub) this.ordersSub.unsubscribe();
    if (this.kitchenSub) this.kitchenSub.unsubscribe();
  }

  setFilterMode(mode: 'TAKEAWAY' | 'ALL'): void {
    this.filterMode = mode;
    const allOrders = this.wsService.allOrders$.value || [];
    const kOrders = this.wsService.kitchenOrders$.value || [];
    this.processTakeawayOrders(allOrders, kOrders);
  }

  private processTakeawayOrders(orders: Order[], kitchenTickets: KitchenOrder[]): void {
    if (!orders || orders.length === 0) {
      this.preparingOrders = [];
      this.readyOrders = [];
      this.cdr.markForCheck();
      return;
    }

    // Filter by mode
    let targetOrders = orders;
    if (this.filterMode === 'TAKEAWAY') {
      const takeawayOnly = orders.filter(o => !o.tableId && !o.roomId);
      // If takeaway specific orders exist, use them; otherwise show active orders so board is never blank
      targetOrders = takeawayOnly.length > 0 ? takeawayOnly : orders;
    }

    const preparing: TakeawayTicket[] = [];
    const ready: TakeawayTicket[] = [];
    const currentReadyIds = new Set<number>();

    targetOrders.forEach(order => {
      if (!order.id) return;

      // Find matching kitchen order if available
      const kTicket = kitchenTickets.find(kt => kt.orderId === order.id);
      const kStatus = (kTicket?.preparationStatus || '').toUpperCase();
      const oStatus = (order.statusName || '').toUpperCase();

      // Rule: Once served, delivered, completed, paid, or cancelled, remove from board
      const isServedOrFinished =
        oStatus.includes('SERVE') ||
        oStatus.includes('DELIVER') ||
        oStatus.includes('COMPLET') ||
        oStatus.includes('PAID') ||
        oStatus.includes('CANCEL') ||
        kStatus === 'DELIVERED' ||
        kStatus === 'SERVED';

      if (isServedOrFinished) {
        return; // Remove completely from the dashboard
      }

      const ticket: TakeawayTicket = {
        orderId: order.id,
        customerName: '',
        itemsSummary: '',
        itemCount: 0,
        status: 'PREPARING',
        orderTime: order.orderTime || new Date().toISOString()
      };

      if (kStatus === 'READY' || oStatus.includes('READY')) {
        ticket.status = 'READY';
        currentReadyIds.add(order.id);

        // Check if newly transitioned to READY to trigger chime
        if (!this.previousReadyIds.has(order.id) && this.previousReadyIds.size > 0) {
          ticket.isRecentlyReady = true;
          if (!this.isMuted) {
            this.wsService.playChimeSound('ready');
          }
        }
        ready.push(ticket);
      } else {
        // RECEIVED / PREPARING / PENDING / PROCESSING
        ticket.status = 'PREPARING';
        preparing.push(ticket);
      }
    });

    this.previousReadyIds = currentReadyIds;
    this.preparingOrders = preparing.slice(0, 30);
    this.readyOrders = ready.slice(0, 30);
    this.recentCompleted = [];

    this.cdr.markForCheck();
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
      this.isFullscreen = true;
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        this.isFullscreen = false;
      }
    }
  }

  toggleSound(): void {
    this.isMuted = !this.isMuted;
    if (!this.isMuted) {
      this.wsService.playChimeSound('ding');
    }
  }

  trackByTicketId(index: number, ticket: TakeawayTicket): any {
    return ticket.orderId || index;
  }

  testChime(): void {
    this.wsService.playChimeSound('ready');
  }
}
