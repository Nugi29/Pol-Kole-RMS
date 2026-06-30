import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { AuditLog, AuditLogService } from '../../../services/audit-log.service';

@Component({
  selector: 'app-audit-logs',
  standalone: false,
  templateUrl: './audit-logs.component.html',
  styleUrl: './audit-logs.component.css'
})
export class AuditLogsComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns = ['timestamp', 'action', 'details', 'performedBy'];
  dataSource = new MatTableDataSource<AuditLog>([]);
  loading = false;
  errorMessage = '';

  constructor(private readonly auditLogService: AuditLogService) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading = true;
    this.auditLogService.getAuditLogs(0, 100).subscribe({
      next: (page) => {
        this.dataSource.data = page.content;
        if (this.paginator) {
          this.dataSource.paginator = this.paginator;
        }
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to retrieve system audit logs.';
        this.loading = false;
      }
    });
  }
}
