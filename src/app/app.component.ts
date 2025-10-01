import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AddressComponent } from './address/address.component';
import { BackwardComponent } from './backward/backward.component';
import { DebugComponent } from './debug/debug.component';
import { ForwardComponent } from './forward/forward.component';
import { RefreshComponent } from './refresh/refresh.component';
import { Home } from './app/home/home';
import { CookiesButtonComponent } from './cookies-button/cookies-button.component';
import {MatToolbarModule} from '@angular/material/toolbar';

@Component({
    selector: 'app-root',
    imports: [MatToolbarModule, RouterOutlet, AddressComponent, BackwardComponent, DebugComponent, ForwardComponent, RefreshComponent, Home, CookiesButtonComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'browser-template';
}
