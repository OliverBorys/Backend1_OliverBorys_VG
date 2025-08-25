import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MissingProductComponent } from './missing-product.component';

describe('MissingProductComponent', () => {
  let component: MissingProductComponent;
  let fixture: ComponentFixture<MissingProductComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MissingProductComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MissingProductComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
