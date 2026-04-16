import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NAV_MENU, NavMenuItem } from '../../config/nav-menu.config';
@Component({
  selector: 'app-mainwindow',
  standalone: false,
  templateUrl: './mainwindow.component.html',
  styleUrls: ['./mainwindow.component.css'],
})
export class MainwindowComponent implements OnInit {
  role: string = '';
  name: string = '';
  isSidebarCollapsed = false;
  navMenu: NavMenuItem[] = [];
  expandedGroups: Record<string, boolean> = {};
  private currentRoles = new Set<string>();
  private readonly iconPaths: Record<string, string> = {
    dashboard: 'M3 11l9-7 9 7M5 10v10h14V10M9 20v-6h6v6',
    shopping_cart: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1 5h12M10 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z',
    table_bar: 'M4 8h16M6 8v11M18 8v11M10 8v11M14 8v11M5 19h14',
    event: 'M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z',
    restaurant_menu: 'M8 3c0 2.5-1.8 3.6-1.8 5.5V21M8 3c0 2.5 1.8 3.6 1.8 5.5V21M13 3v18M16 7h3a2 2 0 012 2v12',
    kitchen: 'M4 6h16M6 6v12a2 2 0 002 2h8a2 2 0 002-2V6M10 10v6M14 10v6',
    receipt: 'M7 3h10v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5V3zM9 8h6M9 12h6M9 16h4',
    people: 'M16 11a4 4 0 10-8 0M3 20a7 7 0 0114 0M19 8a3 3 0 110 6M18 20a5 5 0 00-3-4.6',
    admin_panel_settings: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4',
    bar_chart: 'M5 20V10M12 20V4M19 20v-7',
    settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M12 12m-3 0a3 3 0 106 0 3 3 0 10-6 0',
    sync_alt: 'M5 7h11M13 3l4 4-4 4M19 17H8M11 13l-4 4 4 4',
  };
  constructor(private readonly router: Router) {}
  ngOnInit(): void {
    this.role = localStorage.getItem('role') || '';
    this.name = this.getDisplayName();
    this.currentRoles = this.extractRoles(this.role);
    this.navMenu = this.filterNavMenuByRole(NAV_MENU);
    for (const item of this.navMenu) {
      if (item.children?.length) {
        this.expandedGroups[item.name] = true;
      }
    }
  }
  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
  toggleGroup(group: string): void {
    this.expandedGroups[group] = !this.expandedGroups[group];
  }
  onGroupClick(item: NavMenuItem): void {
    if (this.isSidebarCollapsed) {
      const targetRoute = item.route ?? item.children?.[0]?.route;
      if (targetRoute) {
        this.router.navigateByUrl(targetRoute);
        return;
      }
    }
    this.toggleGroup(item.name);
  }
  isGroupExpanded(group: string): boolean {
    return !!this.expandedGroups[group];
  }
  getSubnavHeight(item: NavMenuItem): number {
    return (item.children?.length ?? 0) * 42;
  }
  getIconPath(icon: string): string {
    return this.iconPaths[icon] || 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z';
  }
  private getDisplayName(): string {
    const savedName = localStorage.getItem('name')?.trim();
    if (savedName) {
      return savedName;
    }
    const savedEmail = localStorage.getItem('email')?.trim();
    if (!savedEmail) {
      return '';
    }
    return savedEmail.split('@')[0]?.trim() || '';
  }
  private extractRoles(rawRoles: string): Set<string> {
    if (!rawRoles?.trim()) {
      return new Set<string>();
    }
    if (rawRoles.trim().startsWith('[')) {
      try {
        const parsedRoles = JSON.parse(rawRoles);
        if (Array.isArray(parsedRoles)) {
          return new Set(parsedRoles.map((role) => this.normalizeRole(String(role))).filter(Boolean));
        }
      } catch {
        // Fall back to comma-separated parsing below.
      }
    }
    return new Set(rawRoles.split(',').map((role) => this.normalizeRole(role)).filter(Boolean));
  }
  private normalizeRole(role: string): string {
    return role.trim().toUpperCase();
  }
  private hasAccess(allowedRoles: string[]): boolean {
    if (this.currentRoles.size === 0) {
      return false;
    }
    return allowedRoles.some((role) => this.currentRoles.has(this.normalizeRole(role)));
  }
  private filterNavMenuByRole(menuItems: NavMenuItem[]): NavMenuItem[] {
    const visibleMenu: NavMenuItem[] = [];
    for (const item of menuItems) {
      const visibleChildren = item.children?.filter((child) => this.hasAccess(child.roles));
      const canAccessItem = this.hasAccess(item.roles);
      if (!canAccessItem) {
        continue;
      }
      if (item.children?.length) {
        if (!visibleChildren?.length) {
          continue;
        }
        visibleMenu.push({
          ...item,
          children: visibleChildren,
        });
        continue;
      }
      visibleMenu.push(item);
    }
    return visibleMenu;
  }
}
