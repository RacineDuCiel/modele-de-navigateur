import { Injectable } from '@angular/core';
import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3';

export interface CookieData {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  expirationDate?: number;
  sameSite?: string;
}

export interface CookieGraphNode extends SimulationNodeDatum {
  id: string;
  label: string;
  type: 'domain' | 'cookie';
  domain?: string;
  rawDomain?: string;
  cookieCount?: number;
}

export interface CookieGraphLink extends SimulationLinkDatum<CookieGraphNode> {
  source: string | CookieGraphNode;
  target: string | CookieGraphNode;
}

@Injectable({
  providedIn: 'root'
})
export class CookieService {

  // @ts-ignore
  electronAPI = window.electronAPI;

  constructor() { }

  async getAllCookies(): Promise<CookieData[]> {
    try {
      const cookies: CookieData[] = await this.electronAPI.getCookies();
      const deduped = new Map<string, CookieData>();

      cookies.forEach((cookie) => {
        const key = `${cookie.domain}::${cookie.path ?? ''}::${cookie.name}`;
        const existing = deduped.get(key);

        if (!existing) {
          deduped.set(key, cookie);
          return;
        }

        const existingExpiration = existing.expirationDate ?? 0;
        const candidateExpiration = cookie.expirationDate ?? 0;

        if (candidateExpiration > existingExpiration) {
          deduped.set(key, cookie);
        }
      });

      return Array.from(deduped.values()).sort((a, b) => {
        const domainCompare = this.normalizeDomain(a.domain).localeCompare(this.normalizeDomain(b.domain));
        if (domainCompare !== 0) {
          return domainCompare;
        }

        const nameCompare = a.name.localeCompare(b.name);
        if (nameCompare !== 0) {
          return nameCompare;
        }

        return (a.path ?? '').localeCompare(b.path ?? '');
      });
    } catch (error) {
      console.error('Error fetching cookies:', error);
      return [];
    }
  }

  async getCookiesForDomain(domain: string): Promise<CookieData[]> {
    try {
      return await this.electronAPI.getCookiesForDomain(domain);
    } catch (error) {
      console.error('Error fetching cookies for domain:', error);
      return [];
    }
  }

  /**
   * Transforme les cookies en données de graphe
   * Retourne les nœuds (domaines et cookies) et les liens
   */
  async getCookieGraphData(): Promise<{nodes: CookieGraphNode[], links: CookieGraphLink[]}> {
    const cookies = await this.getAllCookies();
    const nodes: CookieGraphNode[] = [];
    const links: CookieGraphLink[] = [];
    const domainMap = new Map<string, { count: number; rawDomains: Set<string> }>();

    // Grouper les cookies par domaine
    cookies.forEach(cookie => {
      const normalizedDomain = this.normalizeDomain(cookie.domain);
      const entry = domainMap.get(normalizedDomain) ?? { count: 0, rawDomains: new Set<string>() };
      entry.count += 1;
      entry.rawDomains.add(cookie.domain);
      domainMap.set(normalizedDomain, entry);
    });

    // Créer les nœuds de domaine
    domainMap.forEach((value, domain) => {
      nodes.push({
        id: `domain-${domain}`,
        label: domain,
        type: 'domain',
        domain,
        rawDomain: Array.from(value.rawDomains)[0],
        cookieCount: value.count
      });
    });

    // Créer les nœuds de cookies et les liens
    cookies.forEach(cookie => {
      const normalizedDomain = this.normalizeDomain(cookie.domain);
      const cookieId = `cookie-${normalizedDomain}-${cookie.name}-${cookie.path ?? ''}`;
      const domainId = `domain-${normalizedDomain}`;
      
      nodes.push({
        id: cookieId,
        label: cookie.name,
        type: 'cookie',
        domain: normalizedDomain,
        rawDomain: cookie.domain
      });

      links.push({
        source: domainId,
        target: cookieId
      });
    });

    return { nodes, links };
  }

  /**
   * Obtient les statistiques des cookies
   */
  async getCookieStats(): Promise<{
    totalCookies: number;
    uniqueDomains: number;
    secureCookies: number;
    httpOnlyCookies: number;
    domainStats: { domain: string; count: number }[];
  }> {
    const cookies = await this.getAllCookies();
    const domainMap = new Map<string, number>();
    
    let secureCookies = 0;
    let httpOnlyCookies = 0;

    cookies.forEach(cookie => {
      // Compter par domaine
      const domain = this.normalizeDomain(cookie.domain);
      domainMap.set(domain, (domainMap.get(domain) || 0) + 1);
      
      // Compter les types de cookies
      if (cookie.secure) secureCookies++;
      if (cookie.httpOnly) httpOnlyCookies++;
    });

    // Convertir en array et trier par nombre de cookies
    const domainStats = Array.from(domainMap.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalCookies: cookies.length,
      uniqueDomains: domainMap.size,
      secureCookies,
      httpOnlyCookies,
      domainStats
    };
  }

  setCookiePanelState(state: { open: boolean; width: number }): void {
    try {
      this.electronAPI?.setCookiePanelState?.(state);
    } catch (error) {
      console.error('Error notifying cookie panel state:', error);
    }
  }

  private normalizeDomain(domain: string): string {
    if (!domain) {
      return '';
    }

    return domain.startsWith('.') ? domain.substring(1) : domain;
  }
}