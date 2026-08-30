import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { DashboardService, DashboardStats, DashboardReservation, RecentOrderSummary, TopSellingItem, LowStockAlert, KitchenTicketSummary } from '../../services/dashboard.service';
import { StaffAssignmentService, DailyStaffAssignment } from '../../services/staff-assignment.service';
import { WebsocketService } from '../../services/websocket.service';
import { DialogService } from '../../services/dialog.service';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, OnDestroy {
  stats: DashboardStats = {
    totalTables: 0,
    occupiedTables: 0,
    availableTables: 0,
    cleaningTables: 0,
    tableOccupancyRate: 0,

    totalRooms: 0,
    occupiedRooms: 0,
    availableRooms: 0,
    cleaningRooms: 0,
    maintenanceRooms: 0,
    roomOccupancyRate: 0,

    activeTableReservationsToday: 0,
    activeHotelReservationsToday: 0,
    checkInsToday: 0,
    checkOutsToday: 0,
    activeRoomStaysToday: 0,

    ordersToday: 0,
    ordersThisWeek: 0,
    ordersThisMonth: 0,
    revenueToday: 0.0,
    revenueThisWeek: 0.0,
    revenueThisMonth: 0.0,
    averageOrderValue: 0.0,
    paidInvoicesToday: 0,
    unpaidInvoicesToday: 0,
    unpaidInvoicesTotalAmount: 0.0,

    pendingKitchenOrders: 0,
    readyKitchenOrders: 0,
    lowStockInventoryAlerts: 0,
    staffOnDutyToday: 0,
    totalStaffCount: 0,

    dineInOrdersCount: 0,
    takeawayOrdersCount: 0,
    roomServiceOrdersCount: 0,

    monthlyRevenue: {},
    weeklyRevenue: {},
    revenueByChannel: {},
    orderStatusDistribution: {},

    recentOrders: [],
    todaysReservations: [],
    topSellingItems: [],
    lowStockItems: [],
    activeKitchenTickets: []
  };

  loading = true;
  refreshing = false;
  activeTab: 'overview' | 'dining' | 'hotel' | 'kitchen' | 'inventory' = 'overview';
  chartTimeframe: 'weekly' | 'monthly' = 'weekly';

  // Live Chart Data
  revenueMonths: string[] = [];
  revenueMonthValues: number[] = [];
  maxMonthRevenue = 1000;

  revenueDays: string[] = [];
  revenueDayValues: number[] = [];
  maxDayRevenue = 500;

  // Auto-refresh timer
  autoRefresh = true;
  lastUpdated: Date = new Date();
  currentTime = '';
  currentDate = '';
  private readonly destroy$ = new Subject<void>();

  // Staff & Role Intelligence
  myAssignments: DailyStaffAssignment[] = [];
  currentUserName = '';
  currentUserId: number | null = null;
  userRole = '';

  isAdmin = false;
  isManager = false;
  isChef = false;
  isWaiter = false;
  isCashier = false;
  isReceptionist = false;
  isNonAdmin = false;

  // Role-based permission flags
  canViewFinancials = false;
  canViewKitchen = true;
  canViewHotel = true;
  canViewDining = true;
  canViewInventory = true;

  // Real-time synchronization state
  isSyncStopped = false;

  // Reservations tab filter
  reservationFilter: 'ALL' | 'TABLE' | 'ROOM' = 'ALL';

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly staffAssignmentService: StaffAssignmentService,
    public readonly wsService: WebsocketService,
    private readonly dialogService: DialogService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const rawRole = (localStorage.getItem('role') || '').replace(/^ROLE_/i, '').toUpperCase();
    this.userRole = rawRole || 'STAFF';
    this.currentUserName = localStorage.getItem('name') || 'Staff Member';

    this.isAdmin = this.userRole.includes('ADMIN');
    this.isManager = this.userRole.includes('MANAGER');
    this.isChef = this.userRole.includes('CHEF') || this.userRole.includes('KITCHEN');
    this.isWaiter = this.userRole.includes('WAITER');
    this.isCashier = this.userRole.includes('CASHIER');
    this.isReceptionist = this.userRole.includes('RECEPTION') || this.userRole.includes('FRONT');
    this.isNonAdmin = !this.isAdmin && !this.isManager;

    // Permissions
    this.canViewFinancials = this.isAdmin || this.isManager || this.isCashier;
    this.canViewKitchen = this.isAdmin || this.isManager || this.isChef || this.isWaiter;
    this.canViewHotel = this.isAdmin || this.isManager || this.isReceptionist || this.isCashier || this.isWaiter;
    this.canViewDining = this.isAdmin || this.isManager || this.isWaiter || this.isCashier || this.isChef;
    this.canViewInventory = this.isAdmin || this.isManager || this.isChef;

    // Intelligent default tab selection based on role
    if (this.isChef) {
      this.activeTab = 'kitchen';
    } else if (this.isWaiter) {
      this.activeTab = 'dining';
    } else if (this.isReceptionist) {
      this.activeTab = 'hotel';
    } else {
      this.activeTab = 'overview';
    }

    const idStr = localStorage.getItem('userId') || localStorage.getItem('id');
    if (idStr && !isNaN(Number(idStr))) {
      this.currentUserId = Number(idStr);
      this.loadMyAssignments();
    }

    // Subscribe to real-time synchronization state
    this.wsService.isSyncStopped$
      .pipe(takeUntil(this.destroy$))
      .subscribe(stopped => {
        this.isSyncStopped = stopped;
        this.cdr.markForCheck();
      });

    this.updateClock();
    // Clock ticker every 1s
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateClock();
      });

    // 30s auto-refresh polling
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.autoRefresh && !this.loading && !this.refreshing) {
          this.loadStats(true);
        }
      });

    this.loadStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Stops or resumes real-time table & takeaway display sync and halts all background
   * WebSocket connections and database queries across the platform.
   * Restricted to Admin and Manager roles.
   */
  toggleRealtimeSync(): void {
    if (!this.isAdmin && !this.isManager) return;

    if (!this.isSyncStopped) {
      this.wsService.stopSync();
    } else {
      this.wsService.resumeSync();
      this.loadStats(true);
    }
    this.cdr.markForCheck();
  }

  updateClock(): void {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.currentDate = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    this.cdr.markForCheck();
  }

  loadMyAssignments(): void {
    if (!this.currentUserId) return;
    const today = new Date().toISOString().split('T')[0];
    this.staffAssignmentService.getAssignmentsForUser(this.currentUserId, today).subscribe({
      next: (assignments) => {
        this.myAssignments = assignments || [];
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  loadStats(silent = false): void {
    if (!silent) {
      this.loading = true;
    } else {
      this.refreshing = true;
    }

    this.dashboardService.getStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.lastUpdated = new Date();

        // 1. Monthly Revenue
        const months = Object.keys(data.monthlyRevenue || {});
        const mValues = Object.values(data.monthlyRevenue || {});
        this.revenueMonths = months;
        this.revenueMonthValues = mValues;
        const maxM = Math.max(...mValues, 1000);
        this.maxMonthRevenue = maxM * 1.15;

        // 2. Weekly Revenue
        const days = Object.keys(data.weeklyRevenue || {});
        const dValues = Object.values(data.weeklyRevenue || {});
        this.revenueDays = days;
        this.revenueDayValues = dValues;
        const maxD = Math.max(...dValues, 500);
        this.maxDayRevenue = maxD * 1.15;

        this.loading = false;
        this.refreshing = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load dashboard statistics', err);
        this.loading = false;
        this.refreshing = false;
        this.cdr.markForCheck();
      }
    });
  }

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
  }

  setTab(tab: 'overview' | 'dining' | 'hotel' | 'kitchen' | 'inventory'): void {
    this.activeTab = tab;
  }

  setChartTimeframe(tf: 'weekly' | 'monthly'): void {
    this.chartTimeframe = tf;
  }

  getBarHeight(val: number, isWeekly: boolean): number {
    const max = isWeekly ? this.maxDayRevenue : this.maxMonthRevenue;
    if (max <= 0) return 4;
    const pct = (val / max) * 100;
    return Math.max(pct, 4); // Keep minimum visibility
  }

  getChannelPercentage(channelKey: string): number {
    const channelRev = this.stats.revenueByChannel?.[channelKey] || 0;
    const totalRev = Object.values(this.stats.revenueByChannel || {}).reduce((acc, curr) => acc + curr, 0);
    if (totalRev === 0) return 0;
    return Math.round((channelRev / totalRev) * 100);
  }

  getFilteredReservations(): DashboardReservation[] {
    const list = this.stats.todaysReservations || [];
    if (this.reservationFilter === 'ALL') return list;
    return list.filter(r => r.reservationType === this.reservationFilter);
  }

  getOrderStatusBadgeClass(status: string): string {
    const s = (status || '').toUpperCase();
    if (s.includes('COMPLET') || s.includes('PAID') || s.includes('SERVED')) {
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
    if (s.includes('PREPAR') || s.includes('READY')) {
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    }
    if (s.includes('CANCEL') || s.includes('REJECT')) {
      return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    }
    return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
  }

  getReservationStatusBadgeClass(status: string): string {
    const s = (status || '').toUpperCase();
    if (s.includes('CONFIRM') || s.includes('CHECKED_IN') || s.includes('SEATED')) {
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
    if (s.includes('PENDING')) {
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    }
    if (s.includes('CANCEL')) {
      return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    }
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  }

  getOrderTypeBadge(type: string): { label: string; class: string; icon: string } {
    switch ((type || '').toUpperCase()) {
      case 'DINE_IN':
        return { label: 'Dine-In', class: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800', icon: '🍽️' };
      case 'ROOM_SERVICE':
        return { label: 'Room Service', class: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800', icon: '🏨' };
      case 'TAKEAWAY':
      default:
        return { label: 'Takeaway', class: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800', icon: '📦' };
    }
  }
}

