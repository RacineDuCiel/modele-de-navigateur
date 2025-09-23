import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BrowserService } from '../browser.service';

@Component({
  selector: 'app-navigate-home',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './navigate-home.component.html',
  styleUrl: './navigate-home.component.css'
})
export class NavigateHomeComponent {

  browserService = inject(BrowserService);

  constructor() { }

  goHome(): void {
    this.browserService.goHome();
  }
}
