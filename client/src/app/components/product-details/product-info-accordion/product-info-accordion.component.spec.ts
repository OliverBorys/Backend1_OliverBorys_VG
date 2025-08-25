import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductInfoAccordionComponent } from './product-info-accordion.component';

describe('ProductInfoAccordionComponent', () => {
  let component: ProductInfoAccordionComponent;
  let fixture: ComponentFixture<ProductInfoAccordionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductInfoAccordionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductInfoAccordionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
