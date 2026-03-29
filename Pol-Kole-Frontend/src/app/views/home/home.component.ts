import { Component } from '@angular/core';

type Priority = 'high' | 'medium' | 'low';

interface TaskItem {
  id: number;
  text: string;
  done: boolean;
  priority: Priority;
}

interface CalendarDay {
  day: number;
  outsideMonth: boolean;
  hasEvent: boolean;
  isToday: boolean;
}

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  readonly eventDays = [17, 18, 20, 22, 25];
  readonly calendarDays: CalendarDay[] = [];
  readonly tasks: TaskItem[] = [
    { id: 1, text: 'Review API schema changes', done: false, priority: 'high' },
    { id: 2, text: 'Update iOS build pipeline', done: true, priority: 'medium' },
    { id: 3, text: 'Write Q2 project brief', done: false, priority: 'high' },
    { id: 4, text: 'Design portal wireframes', done: false, priority: 'low' },
    { id: 5, text: 'Schedule team retrospective', done: true, priority: 'medium' },
  ];

  constructor() {
    this.buildCalendar(2026, 2, 17);
  }

  toggleTask(taskId: number): void {
    const task = this.tasks.find((entry) => entry.id === taskId);
    if (task) {
      task.done = !task.done;
    }
  }

  taskPriorityClasses(priority: Priority): string {
    const classes: Record<Priority, string> = {
      high: 'bg-red-50 text-red-500',
      medium: 'bg-amber-50 text-amber-600',
      low: 'bg-emerald-50 text-emerald-600',
    };

    return classes[priority];
  }

  calendarDayClasses(day: CalendarDay): string {
    if (day.outsideMonth) {
      return 'text-slate-300';
    }

    if (day.isToday) {
      return 'bg-indigo-600 text-white font-bold';
    }

    if (day.hasEvent) {
      return 'text-indigo-600 font-bold hover:bg-indigo-50';
    }

    return 'text-slate-600 hover:bg-slate-50';
  }

  trackByTaskId(_: number, task: TaskItem): number {
    return task.id;
  }

  trackByCalendarDay(index: number): number {
    return index;
  }

  private buildCalendar(year: number, monthIndex: number, today: number): void {
    this.calendarDays.length = 0;

    const firstDayOfWeek = new Date(year, monthIndex, 1).getDay();
    const daysInCurrentMonth = new Date(year, monthIndex + 1, 0).getDate();
    const daysInPreviousMonth = new Date(year, monthIndex, 0).getDate();

    for (let offset = firstDayOfWeek - 1; offset >= 0; offset--) {
      this.calendarDays.push({
        day: daysInPreviousMonth - offset,
        outsideMonth: true,
        hasEvent: false,
        isToday: false,
      });
    }

    for (let day = 1; day <= daysInCurrentMonth; day++) {
      this.calendarDays.push({
        day,
        outsideMonth: false,
        hasEvent: this.eventDays.includes(day),
        isToday: day === today,
      });
    }
  }
}
