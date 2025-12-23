import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private sidebarState = new BehaviorSubject<boolean>(true);
  sidebarState$ = this.sidebarState.asObservable();

  toggleSidebar() {
    this.sidebarState.next(!this.sidebarState.value);
  }

  setSidebarState(isOpen: boolean) {
    this.sidebarState.next(isOpen);
  }

  getSidebarState(): boolean {
    return this.sidebarState.value;
  }
}