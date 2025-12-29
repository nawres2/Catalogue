import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { Sidebar } from '../sidebar/sidebar';
import { SidebarService } from '../service/sidebar-service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, Sidebar],
  templateUrl: './layout.html',
  styleUrls: ['./layout.css']
})
export class LayoutComponent implements OnInit, OnDestroy {
  isSidebarOpen = true;
  private subscription?: Subscription;

  constructor(private sidebarService: SidebarService) {}

  ngOnInit() {
    // S'abonner aux changements d'état de la sidebar
    this.subscription = this.sidebarService.sidebarState$.subscribe(
      (state) => {
        this.isSidebarOpen = state;
      }
    );
  }

  ngOnDestroy() {
    // Nettoyer la souscription
    this.subscription?.unsubscribe();
  }
  
}