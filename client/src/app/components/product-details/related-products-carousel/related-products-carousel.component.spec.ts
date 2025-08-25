import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RelatedProductsCarouselComponent } from './related-products-carousel.component';

describe('RelatedProductsCarouselComponent', () => {
  let component: RelatedProductsCarouselComponent;
  let fixture: ComponentFixture<RelatedProductsCarouselComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RelatedProductsCarouselComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RelatedProductsCarouselComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
