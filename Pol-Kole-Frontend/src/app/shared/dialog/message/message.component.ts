import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { DialogMessageData, splitMessageLines } from '../../../shared/utils/ui-utils';

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatDialogModule],
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.css']
})
export class MessageComponent implements OnInit, OnDestroy {
  readonly lines: string[] = [];
  readonly duration: number;
  private timerId: any = null;

  constructor(
    public dialogRef: MatDialogRef<MessageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogMessageData,
  ) {
    this.lines = splitMessageLines(this.data?.message);
    this.duration = this.data?.duration ?? 2500;
    this.dialogRef.addPanelClass('custom-dialog');
    this.dialogRef.addPanelClass('toast-dialog-panel');
  }

  ngOnInit(): void {
    this.timerId = setTimeout(() => {
      this.dismiss();
    }, this.duration);
  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
    }
  }

  dismiss(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.dialogRef.close(true);
  }
}
