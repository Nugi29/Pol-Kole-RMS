import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DashboardService, DashboardStats } from '../../services/dashboard.service';

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

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadStats();
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
