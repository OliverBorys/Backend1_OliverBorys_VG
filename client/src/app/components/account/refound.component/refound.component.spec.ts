import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RefoundComponent } from './refound.component';

describe('RefoundComponent', () => {
  let component: RefoundComponent;
  let fixture: ComponentFixture<RefoundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RefoundComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RefoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
