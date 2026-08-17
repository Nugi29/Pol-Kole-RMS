import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfirmComponent } from '../shared/dialog/confirm/confirm.component';
import { MessageComponent } from '../shared/dialog/message/message.component';

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  private readonly defaultWidth = '420px';

  constructor(private readonly dialog: MatDialog) {}

  confirm(heading: string, message: string, width = this.defaultWidth): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmComponent, {
      width,
      data: { heading, message }
    });
    return dialogRef.afterClosed().pipe(map(result => !!result));
  }

  showMessage(heading: string, message: string, width = this.defaultWidth, duration = 2500): Observable<boolean> {
    const dialogRef = this.dialog.open(MessageComponent, {
      width,
      data: { heading, message, duration }
    });
    return dialogRef.afterClosed().pipe(map(result => !!result));
  }

  message(heading: string, message: string, width = this.defaultWidth, duration = 2500): Observable<boolean> {
    return this.showMessage(heading, message, width, duration);
  }

  showSuccess(heading: string, message: string, duration = 2500): Observable<boolean> {
    return this.showMessage(heading, message, this.defaultWidth, duration);
  }

  showError(heading: string, message: string, duration = 3500): Observable<boolean> {
    return this.showMessage(heading, message, this.defaultWidth, duration);
  }

  confirmAction(heading: string, message: string): Observable<boolean> {
    return this.confirm(heading, message);
  }

  confirmDelete(itemName: string, customMessage?: string): Observable<boolean> {
    const message = customMessage ?? `Are you sure you want to delete "${itemName}"?<br>This action cannot be undone.`;
    return this.confirm('Confirm Delete', message);
  }

  confirmClear(customMessage?: string): Observable<boolean> {
    const message = customMessage ?? 'Do you want to clear all form fields?<br>Unsaved changes will be lost.';
    return this.confirm('Confirm Clear', message);
  }
}
