import { ComponentFixture, TestBed } from '@angular/core/testing';

import { accountComponent } from './account.component';

describe('accountComponent', () => {
  let component: accountComponent;
  let fixture: ComponentFixture<accountComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [accountComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(accountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
