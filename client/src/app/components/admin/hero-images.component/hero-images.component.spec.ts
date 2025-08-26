import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeroImagesComponent } from './hero-images.component';

describe('HeroImagesComponent', () => {
  let component: HeroImagesComponent;
  let fixture: ComponentFixture<HeroImagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeroImagesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeroImagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
