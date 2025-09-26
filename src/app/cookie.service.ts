import { Injectable } from '@angular/core';

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

export interface CookieGraphNode {
  id: string;
  label: string;
  type: 'domain' | 'cookie';
  domain?: string;
  cookieCount?: number;
}

export interface CookieGraphLink {
  source: string;
  target: string;
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
      return await this.electronAPI.getCookies();
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

  setCookiePanelState(state: { open: boolean; width: number }): void {
    try {
      this.electronAPI?.setCookiePanelState?.(state);
    } catch (error) {
      console.error('Error notifying cookie panel state:', error);
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
    const domainMap = new Map<string, number>();

    // Grouper les cookies par domaine
    cookies.forEach(cookie => {
      const domain = cookie.domain;
      if (domainMap.has(domain)) {
        domainMap.set(domain, domainMap.get(domain)! + 1);
      } else {
        domainMap.set(domain, 1);
      }
    });

    // Créer les nœuds de domaine
    domainMap.forEach((count, domain) => {
      nodes.push({
        id: `domain-${domain}`,
        label: domain,
        type: 'domain',
        domain: domain,
        cookieCount: count
      });
    });

    // Créer les nœuds de cookies et les liens
    cookies.forEach(cookie => {
      const cookieId = `cookie-${cookie.domain}-${cookie.name}`;
      const domainId = `domain-${cookie.domain}`;
      
      nodes.push({
        id: cookieId,
        label: cookie.name,
        type: 'cookie',
        domain: cookie.domain
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
      const domain = cookie.domain;
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
}