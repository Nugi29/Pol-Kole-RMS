import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DailyStaffAssignment, StaffAssignmentService } from '../../../services/staff-assignment.service';
import { AttendanceService, ActiveStaffSummary } from '../../../services/attendance.service';
import { TableService, RestaurantTable } from '../../../services/table.service';
import { RoomService, Room } from '../../../services/room.service';
import { DialogService } from '../../../services/dialog.service';
import { forkJoin } from 'rxjs';

export interface WaiterAssignmentGroup {
  waiterId: number;
  waiterName: string;
  waiterEmail?: string;
  onlineStatus: string;
  tables: DailyStaffAssignment[];
  rooms: DailyStaffAssignment[];
  takeaways: DailyStaffAssignment[];
}

@Component({
  selector: 'app-staff-assignment',
  standalone: false,
  templateUrl: './staff-assignment.component.html',
  styleUrls: ['./staff-assignment.component.css']
})
export class StaffAssignmentComponent implements OnInit {
  selectedDate: string = new Date().toISOString().split('T')[0];

  loading = false;
  saving = false;

  // Master data
  allTables: RestaurantTable[] = [];
  allRooms: Room[] = [];
  attendanceSummary: ActiveStaffSummary | null = null;
  assignments: DailyStaffAssignment[] = [];

  // Grouped views
  waiterGroups: WaiterAssignmentGroup[] = [];

  // Manual assign modal
  showAssignModal = false;
  modalTargetType: 'TABLE' | 'ROOM' | 'TAKEAWAY' = 'TABLE';
  modalSelectedStaffId: number | null = null;
  modalSelectedTableId: number | null = null;
  modalSelectedRoomId: number | null = null;
  modalZoneName: string = '';

  constructor(
    private readonly assignmentService: StaffAssignmentService,
    private readonly attendanceService: AttendanceService,
    private readonly tableService: TableService,
    private readonly roomService: RoomService,
    private readonly dialogService: DialogService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAllData();
  }

  onDateChange(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.loading = true;
    forkJoin({
      summary: this.attendanceService.getActiveStaffSummary(this.selectedDate),
      assignments: this.assignmentService.getDailyAssignments(this.selectedDate),
      tables: this.tableService.filterTables(undefined, undefined, undefined, 0, 1000),
      rooms: this.roomService.filterRooms(undefined, undefined, 0, 1000)
    }).subscribe({
      next: (res) => {
        this.attendanceSummary = res.summary;
        this.assignments = res.assignments || [];
        this.allTables = res.tables?.content || [];
        this.allRooms = res.rooms?.content || [];
        this.buildGroups();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.dialogService.showError('Error', 'Failed to load assignment data.');
        this.cdr.markForCheck();
      }
    });
  }

  buildGroups(): void {
    const activeWaiters = this.attendanceSummary?.activeWaiters || [];
    const waiterMap = new Map<number, WaiterAssignmentGroup>();

    for (const w of activeWaiters) {
      waiterMap.set(w.userId, {
        waiterId: w.userId,
        waiterName: w.userName || 'Waiter',
        waiterEmail: w.userEmail,
        onlineStatus: w.onlineStatus || 'OFFLINE',
        tables: [],
        rooms: [],
        takeaways: []
      });
    }

    // Populate waiter assignments
    for (const a of this.assignments) {
      if (a.roleType === 'WAITER') {
        let group = waiterMap.get(a.userId);
        if (!group) {
          group = {
            waiterId: a.userId,
            waiterName: a.userName || 'Waiter',
            waiterEmail: a.userEmail,
            onlineStatus: a.onlineStatus || 'OFFLINE',
            tables: [],
            rooms: [],
            takeaways: []
          };
          waiterMap.set(a.userId, group);
        }

        if (a.assignmentType === 'TABLE' && a.tableId) {
          group.tables.push(a);
        } else if (a.assignmentType === 'ROOM' && a.roomId) {
          group.rooms.push(a);
        } else if (a.assignmentType === 'TAKEAWAY_ZONE') {
          group.takeaways.push(a);
        }
      }
    }

    this.waiterGroups = Array.from(waiterMap.values());
  }

  autoAssignWaiters(): void {
    if ((this.attendanceSummary?.activeWaiters?.length || 0) === 0) {
      this.dialogService.showError('No Active Waiters', 'No active waiters found for today. Please mark attendance first.');
      return;
    }

    this.dialogService.confirmAction(
      'Auto-Assign Waiters',
      `Distribute all ${this.allTables.length} tables and ${this.allRooms.length} rooms fairly among today's ${this.attendanceSummary?.activeWaiters.length} active waiters?`
    ).subscribe((confirmed) => {
      if (confirmed) {
        this.saving = true;
        this.assignmentService.autoAssignWaiters(this.selectedDate).subscribe({
          next: () => {
            this.saving = false;
            this.dialogService.showSuccess('Assignment Complete', 'Tables and rooms have been distributed fairly among active waiters.');
            this.loadAllData();
          },
          error: (err) => {
            this.saving = false;
            this.dialogService.showError('Auto-Assign Failed', err?.error?.message || 'Could not auto-assign staff.');
          }
        });
      }
    });
  }

  unassignItem(assignment: DailyStaffAssignment): void {
    const updated = this.assignments.filter(a => a.id !== assignment.id);
    this.assignmentService.saveCustomAssignments(updated, this.selectedDate).subscribe({
      next: () => {
        this.loadAllData();
      }
    });
  }

  openAssignModal(type: 'TABLE' | 'ROOM' | 'TAKEAWAY', staffId?: number): void {
    this.modalTargetType = type;
    this.modalSelectedStaffId = staffId || (this.waiterGroups[0]?.waiterId || null);
    this.modalSelectedTableId = this.unassignedTables[0]?.id || null;
    this.modalSelectedRoomId = this.unassignedRooms[0]?.id || null;
    this.modalZoneName = type === 'TAKEAWAY' ? 'Takeaway Counter' : '';
    this.showAssignModal = true;
  }

  closeAssignModal(): void {
    this.showAssignModal = false;
  }

  saveAssignmentModal(): void {
    if (!this.modalSelectedStaffId) {
      this.dialogService.showError('Error', 'Please select a staff member.');
      return;
    }

    const newAssignment: DailyStaffAssignment = {
      assignmentDate: this.selectedDate,
      userId: this.modalSelectedStaffId,
      roleType: 'WAITER',
      assignmentType: this.modalTargetType === 'TABLE' ? 'TABLE' : (this.modalTargetType === 'ROOM' ? 'ROOM' : 'TAKEAWAY_ZONE'),
      tableId: this.modalTargetType === 'TABLE' ? (this.modalSelectedTableId || undefined) : undefined,
      roomId: this.modalTargetType === 'ROOM' ? (this.modalSelectedRoomId || undefined) : undefined,
      zoneOrStation: this.modalZoneName || undefined,
      isActive: true
    };

    const currentList = [...this.assignments, newAssignment];
    this.saving = true;
    this.assignmentService.saveCustomAssignments(currentList, this.selectedDate).subscribe({
      next: () => {
        this.saving = false;
        this.closeAssignModal();
        this.dialogService.showSuccess('Assigned', 'Waiter assignment updated.');
        this.loadAllData();
      },
      error: () => {
        this.saving = false;
        this.dialogService.showError('Error', 'Failed to save assignment.');
      }
    });
  }

  get unassignedTables(): RestaurantTable[] {
    const assignedIds = new Set(this.assignments.filter(a => a.assignmentType === 'TABLE' && a.tableId).map(a => a.tableId!));
    return this.allTables.filter(t => t.id && !assignedIds.has(t.id));
  }

  get unassignedRooms(): Room[] {
    const assignedIds = new Set(this.assignments.filter(a => a.assignmentType === 'ROOM' && a.roomId).map(a => a.roomId!));
    return this.allRooms.filter(r => r.id && !assignedIds.has(r.id));
  }

  assignLateStaff(): void {
    const unassignedT = this.unassignedTables;
    const unassignedR = this.unassignedRooms;

    if (unassignedT.length === 0 && unassignedR.length === 0) {
      this.dialogService.showInfo('All Assigned', 'All tables and rooms are already assigned. No unassigned areas.');
      return;
    }

    const lateWaiters = (this.attendanceSummary?.activeWaiters || []).filter(w => w.status === 'LATE');
    if (lateWaiters.length === 0) {
      this.dialogService.showInfo('No Late Waiters', 'No newly checked-in late staff found.');
      return;
    }

    this.dialogService.confirmAction(
      'Assign Late Staff',
      `Assign ${unassignedT.length} unassigned tables and ${unassignedR.length} unassigned rooms to late arriving staff?`
    ).subscribe((confirmed) => {
      if (confirmed) {
        this.saving = true;
        const newAdditions: DailyStaffAssignment[] = [];
        let waiterIdx = 0;

        for (const t of unassignedT) {
          const w = lateWaiters[waiterIdx % lateWaiters.length];
          newAdditions.push({
            assignmentDate: this.selectedDate,
            userId: w.userId,
            roleType: 'WAITER',
            assignmentType: 'TABLE',
            tableId: t.id,
            isActive: true
          });
          waiterIdx++;
        }

        for (const r of unassignedR) {
          const w = lateWaiters[waiterIdx % lateWaiters.length];
          newAdditions.push({
            assignmentDate: this.selectedDate,
            userId: w.userId,
            roleType: 'WAITER',
            assignmentType: 'ROOM',
            roomId: r.id,
            isActive: true
          });
          waiterIdx++;
        }

        const combined = [...this.assignments, ...newAdditions];
        this.assignmentService.saveCustomAssignments(combined, this.selectedDate).subscribe({
          next: () => {
            this.saving = false;
            this.dialogService.showSuccess('Assigned', 'Unassigned areas allocated to late staff.');
            this.loadAllData();
          },
          error: () => {
            this.saving = false;
            this.dialogService.showError('Error', 'Failed to allocate late staff.');
          }
        });
      }
    });
  }
}
