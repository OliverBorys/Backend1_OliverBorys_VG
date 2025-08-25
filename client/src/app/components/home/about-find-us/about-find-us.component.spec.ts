import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AboutFindUsComponent } from './about-find-us.component';

describe('AboutFindUsComponent', () => {
  let component: AboutFindUsComponent;
  let fixture: ComponentFixture<AboutFindUsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutFindUsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AboutFindUsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
