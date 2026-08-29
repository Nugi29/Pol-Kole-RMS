import { Component, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { WebsocketService } from '../../services/websocket.service';
import { StaffNotification, StaffNotificationService } from '../../services/staff-notification.service';

@Component({
  selector: 'app-notification-bell',
  standalone: false,
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.css']
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  showNotificationPanel = false;
  notifications: StaffNotification[] = [];
  unreadCount = 0;

  private readonly subs = new Subscription();

  constructor(
    private readonly wsService: WebsocketService,
    private readonly notificationService: StaffNotificationService,
    private readonly elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.subs.add(
      this.wsService.staffNotifications$.subscribe((notifs) => {
        this.notifications = (notifs || []).filter(
          (n) => n.status !== 'RESOLVED' && n.status !== 'DISMISSED'
        );
      })
    );

    this.subs.add(
      this.wsService.unreadNotificationCount$.subscribe((count) => {
        this.unreadCount = count;
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  toggleNotificationPanel(): void {
    this.showNotificationPanel = !this.showNotificationPanel;
  }

  closeNotificationPanel(): void {
    this.showNotificationPanel = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showNotificationPanel && !this.elementRef.nativeElement.contains(event.target)) {
      this.closeNotificationPanel();
    }
  }

  markNotificationRead(notif: StaffNotification): void {
    this.notificationService.markAsRead(notif.id).subscribe({
      next: (updated) => {
        notif.status = updated.status;
        const unread = this.notifications.filter((n) => n.status === 'UNREAD').length;
        this.unreadCount = unread;
        this.wsService.refreshAllData();
      },
    });
  }

  resolveNotification(notif: StaffNotification): void {
    this.notificationService.resolveNotification(notif.id).subscribe({
      next: () => {
        notif.status = 'RESOLVED';
        this.notifications = this.notifications.filter((n) => n.id !== notif.id);
        this.wsService.resolveGuestCall({
          id: `notif-${notif.id}`,
          locationType: notif.targetType as any,
          locationNumber: notif.targetLabel,
          locationId: notif.targetId,
        });
      },
    });
  }

  markAllRead(): void {
    const toResolve = [...this.notifications];
    this.notifications = [];
    this.unreadCount = 0;
    for (const notif of toResolve) {
      this.notificationService.resolveNotification(notif.id).subscribe();
      this.wsService.resolveGuestCall({
        id: `notif-${notif.id}`,
        locationType: notif.targetType as any,
        locationNumber: notif.targetLabel,
        locationId: notif.targetId,
      });
    }
  }
}
