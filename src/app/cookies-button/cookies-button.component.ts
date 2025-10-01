import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cookies-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button class="cookies-btn" (click)="openCookies()" title="Voir les cookies">
      🍪
    </button>
  `,
  styles: [`
    .cookies-btn {
      background: white;
      color: #2c3e50;
      border: 1px solid #d1d9e0;
      border-radius: 4px;
      width: 36px;
      height: 36px;
      font-size: 18px;
      cursor: pointer;
      margin: 0 5px;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cookies-btn:hover {
      background: #f7f9fa;
      border-color: #b8c2cc;
      transform: translateY(-1px);
    }

    .cookies-btn:active {
      transform: translateY(0);
    }
  `]
})
export class CookiesButtonComponent {
  constructor(private router: Router) {}

  openCookies(): void {
    this.router.navigate(['/cookies']);
  }
}
