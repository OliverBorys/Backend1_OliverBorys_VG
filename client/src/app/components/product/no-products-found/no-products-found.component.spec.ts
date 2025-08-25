import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoProductsFoundComponent } from './no-products-found.component';

describe('NoProductsFoundComponent', () => {
  let component: NoProductsFoundComponent;
  let fixture: ComponentFixture<NoProductsFoundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoProductsFoundComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoProductsFoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
