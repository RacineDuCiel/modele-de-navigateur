import { TestBed } from '@angular/core/testing';
import { CookiesGraphComponent } from './cookies-graph.component';

describe('CookiesGraphComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CookiesGraphComponent]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(CookiesGraphComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
