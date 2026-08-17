import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { Room, RoomService, RoomType } from '../../../services/room.service';
import { CodeService } from '../../../services/code.service';

@Component({
  selector: 'app-room',
  standalone: false,
  templateUrl: './room.component.html',
  styleUrl: './room.component.css'
})
export class RoomComponent implements OnInit {
  private paginator: MatPaginator | null = null;
  @ViewChild(MatPaginator) set matPaginator(mp: MatPaginator) {
    this.paginator = mp;
    this.dataSource.paginator = mp;
  }

  rooms: Room[] = [];
  roomTypes: RoomType[] = [];
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
  viewMode: 'grid' | 'table' = 'table';

  floors = [1, 2, 3, 4, 5];

  constructor(
    private readonly fb: FormBuilder,
    private readonly roomService: RoomService,
    private readonly route: ActivatedRoute,
    private readonly codeService: CodeService,
    private readonly cdr: ChangeDetectorRef
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
    this.loadRoomTypes();
    this.loadRooms();
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
    this.roomService.filterRooms(undefined, undefined, 0, 1000).subscribe({
      next: (page) => {
        this.rooms = page.content;
        this.dataSource.data = page.content;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Failed to load hotel rooms directory.';
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
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to update room.';
          this.loading = false;
        }
      });
    } else {
      this.roomService.createRoom(payload).subscribe({
        next: () => {
          this.loadRooms();
          this.clearForm();
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to create room.';
          this.loading = false;
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
    this.loading = true;
    const payload = { ...room, status: newStatus };
    this.roomService.updateRoom(room.id!, payload).subscribe({
      next: () => {
        this.loadRooms();
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to update room status.';
        this.loading = false;
      }
    });
  }

  deleteRoom(id: number): void {
    if (confirm('Are you sure you want to delete this room?')) {
      this.loading = true;
      this.roomService.deleteRoom(id).subscribe({
        next: () => {
          this.loadRooms();
          this.loading = false;
        },
        error: () => {
          this.errorMessage = 'Failed to delete room.';
          this.loading = false;
        }
      });
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
        },
        error: (err) => {
          this.typeErrorMessage = err.error?.message || 'Failed to update category.';
          this.typeLoading = false;
        }
      });
    } else {
      this.roomService.createRoomType(payload).subscribe({
        next: () => {
          this.loadRoomTypes();
          this.clearTypeForm();
          this.typeLoading = false;
        },
        error: (err) => {
          this.typeErrorMessage = err.error?.message || 'Failed to create category.';
          this.typeLoading = false;
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
    if (confirm('Are you sure you want to delete this room category?')) {
      this.typeLoading = true;
      this.typeErrorMessage = '';
      this.roomService.deleteRoomType(id).subscribe({
        next: () => {
          this.loadRoomTypes();
          this.typeLoading = false;
        },
        error: (err) => {
          this.typeErrorMessage = err.error?.message || 'Failed to delete room category.';
          this.typeLoading = false;
        }
      });
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
