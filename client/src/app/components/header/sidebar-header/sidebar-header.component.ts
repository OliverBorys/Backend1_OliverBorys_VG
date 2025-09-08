import { Component, OnInit, OnDestroy, ElementRef, Renderer2, Input } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { HeaderService } from '../header.service';
import { HeaderState } from '../../../models/header-state.model';
import { FormsModule, NgForm } from '@angular/forms';

import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar-header',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './sidebar-header.component.html',
  styleUrls: ['./sidebar-header.component.css'],
})
export class SidebarHeaderComponent implements OnInit, OnDestroy {
  @Input() isHeaderWhite = false;
  state!: HeaderState;
  private stateSub!: Subscription;
  private removeClickListener: () => void = () => {};

  constructor(
    public headerService: HeaderService,
    private router: Router,
    private el: ElementRef,
    private renderer: Renderer2
  ) {}

  ngOnInit() {
    this.stateSub = this.headerService.state$.subscribe(state => {
      this.state = state;
    });

    this.removeClickListener = this.renderer.listen('document', 'mousedown', this.handleClickOutside);
  }

  ngOnDestroy() {
    this.stateSub?.unsubscribe();
    this.removeClickListener();
  }

  toggleSidebar(event: MouseEvent) {
    event.stopPropagation();
    this.headerService.toggleSidebar();
  }

  handleClickOutside = (event: MouseEvent) => {
    setTimeout(() => {
      const sidebar = this.el.nativeElement.querySelector('.sidebar-nav');
      if (
        this.state?.isSidebarOpen &&
        sidebar &&
        !sidebar.contains(event.target as Node)
      ) {
        this.closeSidebar();
      }
    }, 0);
  };

  handleSearchSubmit(form: NgForm) {
    const searchQuery = form.value.q?.trim();
    if (searchQuery) {
      this.router.navigate(['/search'], { queryParams: { q: searchQuery } });
      form.reset();
      this.closeSidebar();
    }
  }

  closeSidebar() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    this.headerService.toggleSidebar(false);
  }
}
