import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageComponent } from './message.component';

describe('MessageComponent', () => {
  let component: MessageComponent;
  let fixture: ComponentFixture<MessageComponent>;
  let dialogRefMock: { close: ReturnType<typeof vi.fn>; addPanelClass: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.useFakeTimers();

    dialogRefMock = {
      close: vi.fn(),
      addPanelClass: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [MessageComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefMock },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { heading: 'Test Title', message: 'First line<br>Second line', duration: 1000 },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create and parse lines', () => {
    expect(component).toBeTruthy();
    expect(component.lines).toEqual(['First line', 'Second line']);
    expect(component.duration).toBe(1000);
  });

  it('should auto-close after the duration timeout', () => {
    vi.advanceTimersByTime(1000);
    expect(dialogRefMock.close).toHaveBeenCalledWith(true);
  });

  it('should close immediately when dismiss() is called', () => {
    component.dismiss();
    expect(dialogRefMock.close).toHaveBeenCalledWith(true);
  });
});
