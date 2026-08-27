import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { Room, RoomService, RoomType } from '../../../services/room.service';
import { CodeService } from '../../../services/code.service';
import { DialogService } from '../../../services/dialog.service';
import { WebsocketService, GuestServiceCall } from '../../../services/websocket.service';
import { StaffAssignmentService, DailyStaffAssignment } from '../../../services/staff-assignment.service';

@Component({
  selector: 'app-room',
  standalone: false,
  templateUrl: './room.component.html',
  styleUrl: './room.component.css'
})
export class RoomComponent implements OnInit, OnDestroy {
  private paginator: MatPaginator | null = null;
  @ViewChild(MatPaginator) set matPaginator(mp: MatPaginator) {
    this.paginator = mp;
    this.dataSource.paginator = mp;
  }

  rooms: Room[] = [];
  roomTypes: RoomType[] = [];
  myAssignments: DailyStaffAssignment[] = [];
  activeGuestCalls: GuestServiceCall[] = [];
  displayedColumns = ['roomNumber', 'roomTypeName', 'capacity', 'status', 'actions'];
  dataSource = new MatTableDataSource<Room>([]);

  form: FormGroup;
  typeForm: FormGroup;
  editingId: number | null = null;
  editingTypeId: number | null = null;
  loading = false;
  typeLoading = false;
  errorMessage = '';
  typeErrorMessage = '';
  activeTab = 'directory';
  viewMode: 'grid' | 'table' = 'grid';
  statusFilter = 'ALL';
  isNonAdmin = false;
  currentUserId: number | null = null;

  floors = [1, 2, 3, 4, 5];

  private wsSub: Subscription | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly roomService: RoomService,
    private readonly staffAssignmentService: StaffAssignmentService,
    public readonly wsService: WebsocketService,
    private readonly route: ActivatedRoute,
    private readonly codeService: CodeService,
    private readonly cdr: ChangeDetectorRef,
    private readonly dialogService: DialogService
  ) {
    this.form = this.fb.group({
      floor: [1, Validators.required],
      roomNumber: ['', [Validators.required, Validators.maxLength(20)]],
      roomTypeId: ['', Validators.required],
      capacity: [2, [Validators.required, Validators.min(1)]],
      status: ['AVAILABLE', Validators.required]
    });

    this.typeForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', Validators.maxLength(500)],
      maxCapacity: [0, [Validators.required, Validators.min(1)]],
      defaultPrice: [0.00, [Validators.required, Validators.min(0)]],
      amenities: ['', Validators.maxLength(500)]
    });
  }

  ngOnInit(): void {
    const role = (localStorage.getItem('role') || '').toUpperCase();
    const isManagerOrAdmin = role.includes('ADMIN') || role.includes('MANAGER');
    this.isNonAdmin = !isManagerOrAdmin;
    if (this.isNonAdmin) {
      this.statusFilter = 'MY_ASSIGNED';
    }

    const idStr = localStorage.getItem('userId') || localStorage.getItem('id');
    if (idStr && !isNaN(Number(idStr))) {
      this.currentUserId = Number(idStr);
      this.loadMyAssignments();
    }

    this.loadRoomTypes();
    this.loadRooms();

    this.wsSub = this.wsService.activeGuestCalls$.subscribe(calls => {
      this.activeGuestCalls = calls || [];
      this.cdr.markForCheck();
    });

    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
      this.loadRooms();
      this.loadRoomTypes();
      this.cdr.markForCheck();
    });

    this.form.get('floor')?.valueChanges.subscribe(f => {
      if (f && !this.editingId) {
        this.suggestRoomNumber(f);
      }
    });

    this.suggestRoomNumber(1);
  }

  loadMyAssignments(): void {
    if (!this.currentUserId) return;
    const today = new Date().toISOString().split('T')[0];
    this.staffAssignmentService.getAssignmentsForUser(this.currentUserId, today).subscribe({
      next: (assignments) => {
        this.myAssignments = assignments || [];
        this.dataSource.data = this.filteredRooms;
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  setStatusFilter(status: string): void {
    this.statusFilter = status;
    this.dataSource.data = this.filteredRooms;
    this.cdr.markForCheck();
  }

  private normalizeNum(val: any): string {
    if (!val) return '';
    return String(val).toLowerCase().replace(/table/g, '').replace(/room/g, '').replace(/t-/g, '').replace(/t/g, '').replace(/#/g, '').replace(/\s+/g, '').trim();
  }

  get myAssignedRoomsCount(): number {
    return this.rooms.filter(r => {
      const rNorm = this.normalizeNum(r.roomNumber);
      return this.myAssignments.some(a =>
        a.assignmentType === 'ROOM' && (
          (a.roomId && r.id && Number(a.roomId) === Number(r.id)) ||
          (this.normalizeNum(a.roomNumber) === rNorm)
        )
      );
    }).length;
  }

  get filteredRooms(): Room[] {
    if (this.statusFilter === 'MY_ASSIGNED') {
      if (this.myAssignments.length === 0) {
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
    if (this.statusFilter === 'ALL') {
      return this.rooms;
    }
    return this.rooms.filter(r => r.status?.toUpperCase() === this.statusFilter.toUpperCase());
  }

  getGuestCallForRoom(roomId?: number, roomNumber?: string): GuestServiceCall | undefined {
    if (!this.activeGuestCalls || this.activeGuestCalls.length === 0) return undefined;
    const rNorm = this.normalizeNum(roomNumber);
    return this.activeGuestCalls.find(c => {
      if (c.status === 'COMPLETED') return false;
      const isRoom = (c.locationType || '').toUpperCase() === 'ROOM';
      if (!isRoom) return false;
      const callNorm = this.normalizeNum(c.locationNumber);
      return (
        (c.locationId && roomId && Number(c.locationId) === Number(roomId)) ||
        (callNorm === rNorm)
      );
    });
  }

  get urgentRoomCalls(): GuestServiceCall[] {
    return this.activeGuestCalls.filter(c => {
      if ((c.locationType || '').toUpperCase() !== 'ROOM') return false;
      if (c.status !== 'WAITING') return false;
      if (!this.isNonAdmin || this.myAssignments.length === 0) return true;
      const callNorm = this.normalizeNum(c.locationNumber);
      return this.myAssignments.some(a =>
        a.assignmentType === 'ROOM' && (
          (a.roomId && c.locationId && Number(a.roomId) === Number(c.locationId)) ||
          (this.normalizeNum(a.roomNumber) === callNorm)
        )
      );
    });
  }

  acceptRoomCall(call: any): void {
    if (!call?.id) return;
    const staffName = localStorage.getItem('name') || 'Staff';
    this.wsService.updateServiceRequestStatus(call.id, 'IN_PROGRESS', staffName);
    this.dialogService.showSuccess('Room Call Accepted', `Attending to Room ${call.locationNumber} (${call.callType || 'Service'}).`);
  }

  resolveRoomCall(call: any): void {
    if (!call) return;
    this.activeGuestCalls = (this.activeGuestCalls || []).filter(c => {
      if (call.id && c.id === call.id) return false;
      if (call.locationNumber && c.locationNumber && this.normalizeNum(call.locationNumber) === this.normalizeNum(c.locationNumber)) {
        return false;
      }
      return true;
    });
    this.wsService.resolveGuestCall(call);
    this.dialogService.showSuccess('Room Call Resolved', `Resolved request for Room ${call.locationNumber}.`);
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    if (this.wsSub) {
      this.wsSub.unsubscribe();
    }
  }

  loadRoomTypes(): void {
    this.roomService.getRoomTypes().subscribe({
      next: (types) => {
        this.roomTypes = types;
        this.cdr.markForCheck();
        // If there are no room types, seed a default one
        if (types.length === 0) {
          this.seedDefaultRoomTypes();
        }
      }
    });
  }

  seedDefaultRoomTypes(): void {
    const defaults = [
      { name: 'Single Room', description: 'Cozy room for single traveler', maxCapacity: 1, defaultPrice: 50.00, amenities: 'Wifi, AC, TV' },
      { name: 'Double Room', description: 'Standard room with double bed', maxCapacity: 2, defaultPrice: 85.00, amenities: 'Wifi, AC, TV, MiniBar' },
      { name: 'Luxury Suite', description: 'Premium suite with extra space', maxCapacity: 4, defaultPrice: 180.00, amenities: 'Wifi, AC, TV, MiniBar, Jacuzzi, Balcony' }
    ];

    defaults.forEach(t => {
      this.roomService.createRoomType(t as any).subscribe(() => this.roomService.getRoomTypes().subscribe(res => {
        this.roomTypes = res;
        this.cdr.markForCheck();
      }));
    });
  }

  loadRooms(): void {
    this.loading = true;
    this.errorMessage = '';
    this.roomService.filterRooms(undefined, undefined, 0, 1000).subscribe({
      next: (page) => {
        this.rooms = page.content;
        this.dataSource.data = this.filteredRooms;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Failed to load rooms directory';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  saveRoom(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.value;
    this.loading = true;
    this.errorMessage = '';

    if (this.editingId) {
      this.roomService.updateRoom(this.editingId, payload).subscribe({
        next: () => {
          this.loadRooms();
          this.clearForm();
          this.loading = false;
          this.dialogService.showSuccess('Room Updated', 'Room details updated successfully.');
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to update room.';
          this.loading = false;
          this.dialogService.showError('Update Failed', this.errorMessage);
        }
      });
    } else {
      this.roomService.createRoom(payload).subscribe({
        next: () => {
          this.loadRooms();
          this.clearForm();
          this.loading = false;
          this.dialogService.showSuccess('Room Registered', 'New room registered successfully.');
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to create room.';
          this.loading = false;
          this.dialogService.showError('Registration Failed', this.errorMessage);
        }
      });
    }
  }

  editRoom(room: Room): void {
    this.editingId = room.id || null;
    const firstChar = room.roomNumber ? parseInt(room.roomNumber.charAt(0), 10) : 1;
    const floorVal = isNaN(firstChar) ? 1 : firstChar;
    this.form.patchValue({
      floor: floorVal,
      roomNumber: room.roomNumber,
      roomTypeId: room.roomTypeId,
      capacity: room.capacity,
      status: room.status
    });
  }

  quickStatusUpdate(room: Room, newStatus: string): void {
    this.dialogService.confirmAction('Confirm Status Change', `Change Room ${room.roomNumber} status to ${newStatus}?`).subscribe((confirmed) => {
      if (confirmed) {
        this.loading = true;
        const payload = { ...room, status: newStatus };
        this.roomService.updateRoom(room.id!, payload).subscribe({
          next: () => {
            this.loadRooms();
            this.loading = false;
            this.dialogService.showSuccess('Status Updated', `Room ${room.roomNumber} status changed to ${newStatus}.`);
          },
          error: (err) => {
            this.errorMessage = 'Failed to update room status.';
            this.loading = false;
            this.dialogService.showError('Update Failed', err.error?.message || 'Failed to update room status.');
          }
        });
      }
    });
  }

  deleteRoom(id: number): void {
    const room = this.rooms.find(r => r.id === id);
    const roomLabel = room ? `Room ${room.roomNumber}` : 'this room';
    this.dialogService.confirmDelete(roomLabel).subscribe((confirmed) => {
      if (confirmed) {
        this.loading = true;
        this.roomService.deleteRoom(id).subscribe({
          next: () => {
            this.loadRooms();
            this.loading = false;
            this.dialogService.showSuccess('Deleted', `${roomLabel} was deleted successfully.`);
          },
          error: (err) => {
            this.errorMessage = 'Failed to delete room.';
            this.loading = false;
            this.dialogService.showError('Delete Failed', err.error?.message || 'Failed to delete room.');
          }
        });
      }
    });
  }

  requestClear(): void {
    if (this.form.dirty || this.editingId) {
      this.dialogService.confirmClear().subscribe((confirmed) => {
        if (confirmed) {
          this.clearForm();
          this.dialogService.showSuccess('Cleared', 'Form fields cleared successfully.');
        }
      });
    } else {
      this.clearForm();
    }
  }

  clearForm(): void {
    this.editingId = null;
    this.form.reset({
      floor: 1,
      roomNumber: '',
      roomTypeId: '',
      capacity: 2,
      status: 'AVAILABLE'
    });
    this.suggestRoomNumber(1);
  }

  getRoomsCountByStatus(status: string): number {
    return this.rooms.filter(r => r.status?.toUpperCase() === status.toUpperCase()).length;
  }

  saveRoomType(): void {
    if (this.typeForm.invalid) {
      this.typeForm.markAllAsTouched();
      return;
    }

    const payload = this.typeForm.value;
    this.typeLoading = true;
    this.typeErrorMessage = '';

    if (this.editingTypeId) {
      this.roomService.updateRoomType(this.editingTypeId, payload).subscribe({
        next: () => {
          this.loadRoomTypes();
          this.clearTypeForm();
          this.typeLoading = false;
          this.dialogService.showSuccess('Category Updated', 'Room category updated successfully.');
        },
        error: (err) => {
          this.typeErrorMessage = err.error?.message || 'Failed to update category.';
          this.typeLoading = false;
          this.dialogService.showError('Update Failed', this.typeErrorMessage);
        }
      });
    } else {
      this.roomService.createRoomType(payload).subscribe({
        next: () => {
          this.loadRoomTypes();
          this.clearTypeForm();
          this.typeLoading = false;
          this.dialogService.showSuccess('Category Registered', 'New room category registered successfully.');
        },
        error: (err) => {
          this.typeErrorMessage = err.error?.message || 'Failed to create category.';
          this.typeLoading = false;
          this.dialogService.showError('Registration Failed', this.typeErrorMessage);
        }
      });
    }
  }

  editRoomType(type: RoomType): void {
    this.editingTypeId = type.id || null;
    this.typeForm.patchValue({
      name: type.name,
      description: type.description,
      maxCapacity: type.maxCapacity,
      defaultPrice: type.defaultPrice,
      amenities: type.amenities
    });
  }

  deleteRoomType(id: number): void {
    const type = this.roomTypes.find(t => t.id === id);
    const typeLabel = type ? `Category "${type.name}"` : 'this room category';
    this.dialogService.confirmDelete(typeLabel).subscribe((confirmed) => {
      if (confirmed) {
        this.typeLoading = true;
        this.typeErrorMessage = '';
        this.roomService.deleteRoomType(id).subscribe({
          next: () => {
            this.loadRoomTypes();
            this.typeLoading = false;
            this.dialogService.showSuccess('Deleted', `${typeLabel} was deleted successfully.`);
          },
          error: (err) => {
            this.typeErrorMessage = err.error?.message || 'Failed to delete room category.';
            this.typeLoading = false;
            this.dialogService.showError('Delete Failed', this.typeErrorMessage);
          }
        });
      }
    });
  }

  requestClearTypeForm(): void {
    if (this.typeForm.dirty || this.editingTypeId) {
      this.dialogService.confirmClear().subscribe((confirmed) => {
        if (confirmed) {
          this.clearTypeForm();
          this.dialogService.showSuccess('Cleared', 'Category form cleared successfully.');
        }
      });
    } else {
      this.clearTypeForm();
    }
  }

  clearTypeForm(): void {
    this.editingTypeId = null;
    this.typeForm.reset({
      name: '',
      description: '',
      maxCapacity: 2,
      defaultPrice: 0.00,
      amenities: ''
    });
  }

  getRoomsCountForType(typeId: number): { available: number; total: number } {
    const typeRooms = this.rooms.filter(r => r.roomTypeId == typeId);
    return {
      available: typeRooms.filter(r => r.status?.toUpperCase() === 'AVAILABLE').length,
      total: typeRooms.length
    };
  }

  suggestRoomNumber(floor: number): void {
    this.codeService.getNextRoomNumber(floor).subscribe({
      next: (val) => {
        this.form.patchValue({ roomNumber: val });
      },
      error: () => {
        const prefix = String(floor);
        const matching = this.rooms
          .map(r => r.roomNumber)
          .filter(num => num && num.startsWith(prefix));
        let maxVal = 0;
        matching.forEach(num => {
          const parsed = parseInt(num, 10);
          if (!isNaN(parsed) && parsed > maxVal) {
            maxVal = parsed;
          }
        });
        const nextNum = maxVal > 0 ? maxVal + 1 : Number(prefix + '01');
        this.form.patchValue({ roomNumber: String(nextNum) });
      }
    });
  }
}
