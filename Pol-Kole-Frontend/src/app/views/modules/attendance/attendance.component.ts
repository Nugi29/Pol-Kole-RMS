import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AttendanceRecord, AttendanceService, AttendanceStatus, ActiveStaffSummary } from '../../../services/attendance.service';
import { DialogService } from '../../../services/dialog.service';

@Component({
  selector: 'app-attendance',
  standalone: false,
  templateUrl: './attendance.component.html',
  styleUrls: ['./attendance.component.css']
})
export class AttendanceComponent implements OnInit {
  activeTab: 'today' | 'history' = 'today';
  selectedDate: string = new Date().toISOString().split('T')[0];
  
  // Today's records & summary
  todayRecords: AttendanceRecord[] = [];
  summary: ActiveStaffSummary | null = null;
  loading: boolean = false;
  saving: boolean = false;

  // History filters & records
  historyStartDate: string = '';
  historyEndDate: string = '';
  historyRoleFilter: string = 'ALL';
  historyStatusFilter: string = 'ALL';
  historySearchQuery: string = '';
  historyRecords: AttendanceRecord[] = [];

  // Edit / Notes modal
  editingRecord: AttendanceRecord | null = null;
  editStatus: AttendanceStatus = 'PRESENT';
  editNotes: string = '';

  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly dialogService: DialogService,
    private readonly cdr: ChangeDetectorRef
  ) {
    const today = new Date();
    this.selectedDate = today.toISOString().split('T')[0];
    
    // Default history to last 14 days
    const past = new Date();
    past.setDate(today.getDate() - 14);
    this.historyStartDate = past.toISOString().split('T')[0];
    this.historyEndDate = this.selectedDate;
  }

  ngOnInit(): void {
    this.loadTodayAttendance();
  }

  switchTab(tab: 'today' | 'history'): void {
    this.activeTab = tab;
    if (tab === 'today') {
      this.loadTodayAttendance();
    } else {
      this.loadHistory();
    }
  }

  loadTodayAttendance(): void {
    this.loading = true;
    this.attendanceService.getActiveStaffSummary(this.selectedDate).subscribe({
      next: (sum) => {
        this.summary = sum;
      },
      error: () => {}
    });

    this.attendanceService.getAttendanceByDate(this.selectedDate).subscribe({
      next: (records) => {
        this.todayRecords = records || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.dialogService.showError('Error', 'Failed to load attendance records.');
        this.cdr.markForCheck();
      }
    });
  }

  onDateChange(): void {
    this.loadTodayAttendance();
  }

  quickCheckIn(userId: number, userName?: string): void {
    this.saving = true;
    this.attendanceService.checkIn(userId).subscribe({
      next: () => {
        this.saving = false;
        this.dialogService.showSuccess('Checked In', `${userName || 'Staff member'} checked in successfully.`);
        this.loadTodayAttendance();
      },
      error: (err) => {
        this.saving = false;
        this.dialogService.showError('Check-in Failed', 'Could not record check-in.');
      }
    });
  }

  quickCheckOut(userId: number, userName?: string): void {
    this.saving = true;
    this.attendanceService.checkOut(userId).subscribe({
      next: () => {
        this.saving = false;
        this.dialogService.showSuccess('Checked Out', `${userName || 'Staff member'} checked out successfully.`);
        this.loadTodayAttendance();
      },
      error: (err) => {
        this.saving = false;
        this.dialogService.showError('Check-out Failed', 'Could not record check-out.');
      }
    });
  }

  updateStatus(record: AttendanceRecord, newStatus: AttendanceStatus): void {
    const payload: Partial<AttendanceRecord> = {
      userId: record.userId,
      attendanceDate: this.selectedDate,
      status: newStatus,
      checkInTime: record.checkInTime,
      checkOutTime: record.checkOutTime,
      notes: record.notes
    };

    this.attendanceService.markAttendance(payload).subscribe({
      next: () => {
        this.loadTodayAttendance();
      },
      error: () => {
        this.dialogService.showError('Error', 'Failed to update attendance status.');
      }
    });
  }

  openEditModal(record: AttendanceRecord): void {
    this.editingRecord = record;
    this.editStatus = record.status;
    this.editNotes = record.notes || '';
  }

  closeEditModal(): void {
    this.editingRecord = null;
  }

  saveEditModal(): void {
    if (!this.editingRecord) return;

    this.saving = true;
    const payload: Partial<AttendanceRecord> = {
      userId: this.editingRecord.userId,
      attendanceDate: this.selectedDate,
      status: this.editStatus,
      notes: this.editNotes,
      checkInTime: this.editingRecord.checkInTime,
      checkOutTime: this.editingRecord.checkOutTime
    };

    this.attendanceService.markAttendance(payload).subscribe({
      next: () => {
        this.saving = false;
        this.closeEditModal();
        this.dialogService.showSuccess('Updated', 'Attendance record updated.');
        this.loadTodayAttendance();
      },
      error: () => {
        this.saving = false;
        this.dialogService.showError('Error', 'Failed to update record.');
      }
    });
  }

  markAllPresent(): void {
    this.dialogService.confirmAction(
      'Mark All Present',
      `Mark all unrecorded staff as PRESENT for ${this.selectedDate}?`
    ).subscribe(confirmed => {
      if (confirmed) {
        this.saving = true;
        const unrecorded = this.todayRecords.filter(r => r.status === 'ABSENT' && !r.checkInTime);
        if (unrecorded.length === 0) {
          this.saving = false;
          return;
        }

        let completed = 0;
        unrecorded.forEach(r => {
          this.attendanceService.markAttendance({
            userId: r.userId,
            attendanceDate: this.selectedDate,
            status: 'PRESENT'
          }).subscribe({
            next: () => {
              completed++;
              if (completed === unrecorded.length) {
                this.saving = false;
                this.loadTodayAttendance();
                this.dialogService.showSuccess('Complete', `Marked ${completed} staff members as PRESENT.`);
              }
            },
            error: () => {
              this.saving = false;
            }
          });
        });
      }
    });
  }

  loadHistory(): void {
    this.loading = true;
    this.attendanceService.getAttendanceHistory(this.historyStartDate, this.historyEndDate).subscribe({
      next: (records) => {
        this.historyRecords = records || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.dialogService.showError('Error', 'Failed to load attendance history.');
        this.cdr.markForCheck();
      }
    });
  }

  get filteredHistoryRecords(): AttendanceRecord[] {
    return this.historyRecords.filter(r => {
      if (this.historyRoleFilter !== 'ALL') {
        if (!r.roleName || !r.roleName.toUpperCase().includes(this.historyRoleFilter)) {
          return false;
        }
      }
      if (this.historyStatusFilter !== 'ALL') {
        if (r.status !== this.historyStatusFilter) {
          return false;
        }
      }
      if (this.historySearchQuery.trim()) {
        const query = this.historySearchQuery.toLowerCase();
        const nameMatch = r.userName?.toLowerCase().includes(query);
        const emailMatch = r.userEmail?.toLowerCase().includes(query);
        if (!nameMatch && !emailMatch) return false;
      }
      return true;
    });
  }

  getStatusBadgeClass(status?: AttendanceStatus): string {
    switch (status) {
      case 'PRESENT': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800';
      case 'LATE': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800';
      case 'ON_LEAVE': return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800';
      case 'ABSENT':
      default:
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800';
    }
  }
}
