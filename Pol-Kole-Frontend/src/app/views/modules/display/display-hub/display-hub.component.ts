import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TableService, RestaurantTable } from '../../../../services/table.service';
import { RoomService, Room } from '../../../../services/room.service';
import { StaffAssignmentService, DailyStaffAssignment } from '../../../../services/staff-assignment.service';

@Component({
  selector: 'app-display-hub',
  standalone: false,
  templateUrl: './display-hub.component.html',
  styleUrls: ['./display-hub.component.css']
})
export class DisplayHubComponent implements OnInit, OnDestroy {
  tables: RestaurantTable[] = [];
  rooms: Room[] = [];
  myAssignments: DailyStaffAssignment[] = [];
  loading = false;
  activeTab = 'screens';
  filterMyAssignedOnly = false;
  isNonAdmin = false;
  isDisplayOnly = false;
  currentUserId: number | null = null;
  currentUserName = '';

  private routeSub: Subscription | null = null;

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly tableService: TableService,
    private readonly roomService: RoomService,
    private readonly staffAssignmentService: StaffAssignmentService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const role = (localStorage.getItem('role') || '').toUpperCase();
    const isManagerOrAdmin = role.includes('ADMIN') || role.includes('MANAGER');
    this.isNonAdmin = !isManagerOrAdmin;
    this.isDisplayOnly = role.includes('DISPLAY') && !isManagerOrAdmin;
    this.filterMyAssignedOnly = this.isNonAdmin;
    this.currentUserName = localStorage.getItem('name') || 'Staff';

    const idStr = localStorage.getItem('userId') || localStorage.getItem('id');
    if (idStr && !isNaN(Number(idStr))) {
      this.currentUserId = Number(idStr);
      this.loadMyAssignments();
    }

    this.loadResources();
    this.routeSub = this.route.queryParams.subscribe(params => {
      this.activeTab = 'screens';
      this.cdr.markForCheck();
    });
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

  private normalizeNum(val: any): string {
    if (!val) return '';
    return String(val).toLowerCase().replace(/table/g, '').replace(/room/g, '').replace(/t-/g, '').replace(/t/g, '').replace(/#/g, '').replace(/\s+/g, '').trim();
  }

  get filteredTables(): RestaurantTable[] {
    if (!this.filterMyAssignedOnly || this.myAssignments.length === 0) {
      return this.tables;
    }
    return this.tables.filter(t => {
      const tNorm = this.normalizeNum(t.tableNumber);
      return this.myAssignments.some(a =>
        a.assignmentType === 'TABLE' && (
          (a.tableId && t.id && Number(a.tableId) === Number(t.id)) ||
          (this.normalizeNum(a.tableNumber) === tNorm)
        )
      );
    });
  }

  get filteredRooms(): Room[] {
    if (!this.filterMyAssignedOnly || this.myAssignments.length === 0) {
      return this.rooms;
    }
    return this.rooms.filter(r => {
      const rNorm = this.normalizeNum(r.roomNumber);
      return this.myAssignments.some(a =>
        a.assignmentType === 'ROOM' && (
          (a.roomId && r.id && Number(a.roomId) === Number(r.id)) ||
          (this.normalizeNum(a.roomNumber) === rNorm)
        )
      );
    });
  }

  ngOnDestroy(): void {
    if (this.routeSub) this.routeSub.unsubscribe();
  }

  loadResources(): void {
    this.loading = true;
    this.tableService.filterTables(undefined, undefined, undefined, 0, 100).subscribe({
      next: (page) => {
        this.tables = page?.content || [];
        this.cdr.markForCheck();
      }
    });

    this.roomService.filterRooms(undefined, undefined, 0, 100).subscribe({
      next: (page) => {
        this.rooms = page?.content || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  launchTakeawayScreen(): void {
    window.open('/display/takeaway', '_blank');
  }

  openTableDisplay(tableId?: number): void {
    if (!tableId) return;
    window.open(`/display/table/${tableId}`, '_blank');
  }

  openRoomDisplay(roomId?: number): void {
    if (!roomId) return;
    window.open(`/display/room/${roomId}`, '_blank');
  }

}
