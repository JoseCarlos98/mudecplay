import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NavigationService } from '../navigation.service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatToolbarModule, MatButtonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header implements OnInit {
  @Output() toggleSidebar = new EventEmitter<void>();
  modules: any[] = [];
  activeModule: any = null;

  constructor(private navigationService: NavigationService, private router: Router) { }


  ngOnInit() {

  }

onToggleClick(event: MouseEvent) {
  event.stopPropagation();
  this.toggleSidebar.emit(); 
}

  
}
