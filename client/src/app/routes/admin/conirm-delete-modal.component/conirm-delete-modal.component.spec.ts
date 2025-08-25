import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConirmDeleteModalComponent } from './conirm-delete-modal.component';

describe('ConirmDeleteModalComponent', () => {
  let component: ConirmDeleteModalComponent;
  let fixture: ComponentFixture<ConirmDeleteModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConirmDeleteModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConirmDeleteModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
