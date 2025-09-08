import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit } from '@angular/core';


@Component({
  selector: 'app-confirm-delete-modal',
  standalone: true,
  imports: [],
  templateUrl: './confirm-delete-modal.component.html',
  styleUrls: ['./confirm-delete-modal.component.css'],
})
export class ConfirmDeleteModalComponent implements AfterViewInit {
  @Input() itemName: string = '';
  @Input() errorMessage: string | null = null;
  @Input() isLoading: boolean = false;
  @Output() confirm = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  @ViewChild('modalBox') modalBox!: ElementRef;

  ngAfterViewInit() {
    this.modalBox.nativeElement.focus();
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.close.emit();
    }
  }
}
