import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NavigateHomeComponent } from './navigate-home.component';

describe('NavigateHomeComponent', () => {
  let component: NavigateHomeComponent;
  let fixture: ComponentFixture<NavigateHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavigateHomeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NavigateHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
