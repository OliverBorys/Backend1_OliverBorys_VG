import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RefundsComponent } from './refund.component';

describe('RefundComponent', () => {
  let component: RefundsComponent;
  let fixture: ComponentFixture<RefundsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RefundsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RefundsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
