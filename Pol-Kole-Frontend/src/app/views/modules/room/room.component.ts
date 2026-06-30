import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { Room, RoomService, RoomType } from '../../../services/room.service';

@Component({
  selector: 'app-room',
  standalone: false,
  templateUrl: './room.component.html',
  styleUrl: './room.component.css'
})
export class RoomComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  rooms: Room[] = [];
  roomTypes: RoomType[] = [];
  displayedColumns = ['roomNumber', 'roomTypeName', 'capacity', 'status', 'actions'];
  dataSource = new MatTableDataSource<Room>([]);

  form: FormGroup;
  editingId: number | null = null;
  loading = false;
  errorMessage = '';
  activeTab = 'directory';
  viewMode: 'grid' | 'table' = 'table';

  constructor(
    private readonly fb: FormBuilder,
    private readonly roomService: RoomService,
    private readonly route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      roomNumber: ['', [Validators.required, Validators.maxLength(20)]],
      roomTypeId: ['', Validators.required],
      capacity: [2, [Validators.required, Validators.min(1)]],
      status: ['AVAILABLE', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadRoomTypes();
    this.loadRooms();
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
    });
  }

  loadRoomTypes(): void {
    this.roomService.getRoomTypes().subscribe({
      next: (types) => {
        this.roomTypes = types;
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
      this.roomService.createRoomType(t as any).subscribe(() => this.roomService.getRoomTypes().subscribe(res => this.roomTypes = res));
    });
  }

  loadRooms(): void {
    this.loading = true;
    this.roomService.filterRooms().subscribe({
      next: (page) => {
        this.rooms = page.content;
        this.dataSource.data = page.content;
        if (this.paginator) {
          this.dataSource.paginator = this.paginator;
        }
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load hotel rooms directory.';
        this.loading = false;
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
    this.form.patchValue({
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
      roomNumber: '',
      roomTypeId: '',
      capacity: 2,
      status: 'AVAILABLE'
    });
  }

  getRoomsCountByStatus(status: string): number {
    return this.rooms.filter(r => r.status === status).length;
  }
}
