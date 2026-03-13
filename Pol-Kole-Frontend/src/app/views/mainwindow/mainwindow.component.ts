import { Component } from '@angular/core';

@Component({
  selector: 'app-mainwindow',
  standalone: false,
  templateUrl: './mainwindow.component.html',
  styleUrl: './mainwindow.component.css',
})
export class MainwindowComponent {
  role: string = '';

  ngOnInit() {
    this.role = localStorage.getItem('role') || '';
  }
}

