import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DashboardService, DashboardStats } from '../../services/dashboard.service';
import { StaffAssignmentService, DailyStaffAssignment } from '../../services/staff-assignment.service';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  stats: DashboardStats = {
    totalTables: 20,
    occupiedTables: 0,
    availableTables: 20,
    cleaningTables: 0,
    activeReservationsToday: 0,
    ordersToday: 0,
    revenueToday: 0.0,
    pendingKitchenOrders: 0,
    lowStockInventoryAlerts: 0,
    monthlyRevenue: {}
  };
  
  loading = true;
  revenueMonths: string[] = [];
  revenueValues: number[] = [];
  maxRevenue = 1000;

  myAssignments: DailyStaffAssignment[] = [];
  isNonAdmin = false;
  currentUserName = '';
  currentUserId: number | null = null;

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly staffAssignmentService: StaffAssignmentService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const role = (localStorage.getItem('role') || '').toUpperCase();
    const isManagerOrAdmin = role.includes('ADMIN') || role.includes('MANAGER');
    this.isNonAdmin = !isManagerOrAdmin;
    this.currentUserName = localStorage.getItem('name') || 'Staff';

    const idStr = localStorage.getItem('userId') || localStorage.getItem('id');
    if (idStr && !isNaN(Number(idStr))) {
      this.currentUserId = Number(idStr);
      this.loadMyAssignments();
    }

    this.loadStats();
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

  loadStats(): void {
    this.loading = true;
    this.dashboardService.getStats().subscribe({
      next: (data) => {
        this.stats = data;
        
        // Extract revenue trends
        const months = Object.keys(data.monthlyRevenue || {});
        const values = Object.values(data.monthlyRevenue || {});
        this.revenueMonths = months;
        this.revenueValues = values;

        const max = Math.max(...values, 1000);
        this.maxRevenue = max * 1.1; // Add padding

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load dashboard statistics', err);
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  getBarHeight(val: number): number {
    if (this.maxRevenue === 0) return 0;
    return (val / this.maxRevenue) * 100;
  }
}
