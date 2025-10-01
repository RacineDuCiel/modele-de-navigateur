import { Routes } from '@angular/router';
import { CookiesComponent } from './cookies/cookies.component';
import { CookiesGraphComponent } from './cookies-graph/cookies-graph.component';

export const routes: Routes = [
  { path: 'cookies', component: CookiesComponent },
  { path: 'cookies-graph', component: CookiesGraphComponent },
  { path: '', redirectTo: '', pathMatch: 'full' }
];
