import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { DialogService } from './dialog.service';
import { ConfirmComponent } from '../shared/dialog/confirm/confirm.component';
import { MessageComponent } from '../shared/dialog/message/message.component';

describe('DialogService', () => {
  let service: DialogService;
  let dialogMock: { open: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    dialogMock = {
      open: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        DialogService,
        { provide: MatDialog, useValue: dialogMock },
      ],
    });

    service = TestBed.inject(DialogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should open ConfirmComponent with heading and message when confirm is called', async () => {
    const mockRef = { afterClosed: () => of(true) } as MatDialogRef<ConfirmComponent>;
    dialogMock.open.mockReturnValue(mockRef);

    const result = await new Promise<boolean>((resolve) => {
      service.confirm('Test Heading', 'Test Message').subscribe((res) => resolve(res));
    });

    expect(dialogMock.open).toHaveBeenCalledWith(ConfirmComponent, {
      width: '420px',
      data: { heading: 'Test Heading', message: 'Test Message' },
    });
    expect(result).toBe(true);
  });

  it('should open MessageComponent with heading and message when showMessage is called', async () => {
    const mockRef = { afterClosed: () => of(true) } as MatDialogRef<MessageComponent>;
    dialogMock.open.mockReturnValue(mockRef);

    const result = await new Promise<boolean>((resolve) => {
      service.showMessage('Info', 'Operation succeeded').subscribe((res) => resolve(res));
    });

    expect(dialogMock.open).toHaveBeenCalledWith(MessageComponent, {
      width: '420px',
      data: { heading: 'Info', message: 'Operation succeeded', duration: 2500 },
    });
    expect(result).toBe(true);
  });

  it('should format confirmDelete properly', async () => {
    const mockRef = { afterClosed: () => of(true) } as MatDialogRef<ConfirmComponent>;
    dialogMock.open.mockReturnValue(mockRef);

    await new Promise<boolean>((resolve) => {
      service.confirmDelete('Room 101').subscribe((res) => resolve(res));
    });

    expect(dialogMock.open).toHaveBeenCalledWith(ConfirmComponent, {
      width: '420px',
      data: {
        heading: 'Confirm Delete',
        message: 'Are you sure you want to delete "Room 101"?<br>This action cannot be undone.',
      },
    });
  });

  it('should format confirmClear properly', async () => {
    const mockRef = { afterClosed: () => of(false) } as MatDialogRef<ConfirmComponent>;
    dialogMock.open.mockReturnValue(mockRef);

    const result = await new Promise<boolean>((resolve) => {
      service.confirmClear().subscribe((res) => resolve(res));
    });

    expect(dialogMock.open).toHaveBeenCalledWith(ConfirmComponent, {
      width: '420px',
      data: {
        heading: 'Confirm Clear',
        message: 'Do you want to clear all form fields?<br>Unsaved changes will be lost.',
      },
    });
    expect(result).toBe(false);
  });
});
