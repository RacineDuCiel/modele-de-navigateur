import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BrowserService, Cookie } from '../browser.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cookies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cookies.component.html',
  styleUrls: ['./cookies.component.css']
})
export class CookiesComponent implements OnInit, OnDestroy {
  cookies: Cookie[] = [];
  filteredCookies: Cookie[] = [];
  searchTerm: string = '';
  selectedDomain: string = 'all';
  domains: string[] = [];
  private subscription?: Subscription;

  constructor(
    private browserService: BrowserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.browserService.hideWebView(); // Hide web view when entering cookies page
    this.loadCookies();
    
    // Subscribe to cookie changes
    this.subscription = this.browserService.cookies$.subscribe(cookies => {
      this.cookies = cookies;
      this.updateDomains();
      this.filterCookies();
    });
  }

  ngOnDestroy(): void {
    this.browserService.showWebView(); // Show web view when leaving cookies page
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  async loadCookies(): Promise<void> {
    this.cookies = await this.browserService.getCookies();
    this.updateDomains();
    this.filterCookies();
  }

  updateDomains(): void {
    const domainSet = new Set(this.cookies.map(c => c.domain));
    this.domains = Array.from(domainSet).sort();
  }

  filterCookies(): void {
    let filtered = this.cookies;

    // Filter by domain
    if (this.selectedDomain !== 'all') {
      filtered = filtered.filter(c => c.domain === this.selectedDomain);
    }

    // Filter by search term
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(term) ||
        c.domain.toLowerCase().includes(term) ||
        c.value.toLowerCase().includes(term)
      );
    }

    this.filteredCookies = filtered;
  }

  onSearchChange(): void {
    this.filterCookies();
  }

  onDomainChange(): void {
    this.filterCookies();
  }

  getCookiesByDomain(): Map<string, Cookie[]> {
    const map = new Map<string, Cookie[]>();
    
    for (const cookie of this.filteredCookies) {
      if (!map.has(cookie.domain)) {
        map.set(cookie.domain, []);
      }
      map.get(cookie.domain)!.push(cookie);
    }
    
    return map;
  }

  formatExpirationDate(timestamp?: number): string {
    if (!timestamp) return 'Session';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  }

  navigateToGraph(): void {
    this.router.navigate(['/cookies-graph']);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  getHttpOnlyCount(): number {
    return this.filteredCookies.filter(c => c.httpOnly).length;
  }

  getSecureCount(): number {
    return this.filteredCookies.filter(c => c.secure).length;
  }

  async clearAll(): Promise<void> {
    if (confirm('Voulez-vous vraiment supprimer TOUS les cookies ?')) {
      const result = await this.browserService.clearAllCookies();
      if (result.success) {
        await this.loadCookies();
      }
    }
  }

  async deleteDomain(): Promise<void> {
    if (this.selectedDomain !== 'all') {
      if (confirm(`Voulez-vous supprimer tous les cookies de ${this.selectedDomain} ?`)) {
        const result = await this.browserService.deleteCookiesByDomain(this.selectedDomain);
        if (result.success) {
          await this.loadCookies();
          this.selectedDomain = 'all';
        }
      }
    }
  }
}
