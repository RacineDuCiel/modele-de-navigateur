import { TestBed } from '@angular/core/testing';
import { CookiesComponent } from './cookies.component';

describe('CookiesComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CookiesComponent]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(CookiesComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
