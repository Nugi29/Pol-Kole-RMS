import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TableService, RestaurantTable } from '../../../../services/table.service';
import { RoomService, Room } from '../../../../services/room.service';
import { WebsocketService, GuestServiceCall } from '../../../../services/websocket.service';

@Component({
  selector: 'app-display-hub',
  standalone: false,
  templateUrl: './display-hub.component.html',
  styleUrls: ['./display-hub.component.css']
})
export class DisplayHubComponent implements OnInit, OnDestroy {
  tables: RestaurantTable[] = [];
  rooms: Room[] = [];
  activeGuestCalls: GuestServiceCall[] = [];
  loading = false;
  activeTab: 'screens' | 'calls' = 'screens';

  private wsSub: Subscription | null = null;

  constructor(
    private readonly router: Router,
    private readonly tableService: TableService,
    private readonly roomService: RoomService,
    public readonly wsService: WebsocketService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadResources();
    this.wsSub = this.wsService.activeGuestCalls$.subscribe(calls => {
      this.activeGuestCalls = calls;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    if (this.wsSub) this.wsSub.unsubscribe();
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

  resolveCall(call: GuestServiceCall): void {
    if (call.id) {
      this.wsService.resolveGuestCall(call.id);
    }
  }
}
