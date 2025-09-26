import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { CookieService, CookieData, CookieGraphNode, CookieGraphLink } from '../cookie.service';
import * as d3 from 'd3';

@Component({
  selector: 'app-cookies',
  standalone: true,
  imports: [
    CommonModule, 
    MatButtonModule, 
    MatIconModule, 
    MatTableModule, 
    MatCardModule, 
    MatTabsModule,
    MatBadgeModule
  ],
  templateUrl: './cookies.component.html',
  styleUrls: ['./cookies.component.css']
})
export class CookiesComponent implements OnInit, AfterViewInit {
  
  @ViewChild('cookieGraph', { static: false }) graphElement!: ElementRef;
  @ViewChild('cookiePanel', { static: false }) cookiePanel!: ElementRef<HTMLDivElement>;
  
  cookies: CookieData[] = [];
  cookieStats: any = null;
  displayedColumns: string[] = ['name', 'domain', 'value', 'secure', 'httpOnly', 'path'];
  
  showCookiePanel = false;
  graphData: {nodes: CookieGraphNode[], links: CookieGraphLink[]} = {nodes: [], links: []};

  constructor(private cookieService: CookieService) { }

  async ngOnInit(): Promise<void> {
    await this.loadCookies();
    await this.loadStats();
  }

  ngAfterViewInit(): void {
    // L'initialisation du graphique sera faite quand le panel s'ouvre
  }

  async loadCookies(): Promise<void> {
    this.cookies = await this.cookieService.getAllCookies();
  }

  async loadStats(): Promise<void> {
    this.cookieStats = await this.cookieService.getCookieStats();
  }

  async toggleCookiePanel(): Promise<void> {
    this.showCookiePanel = !this.showCookiePanel;
    if (this.showCookiePanel) {
      await this.loadCookies();
      await this.loadStats();
      await this.loadGraphData();
      // Petit délai pour s'assurer que le DOM est rendu
      setTimeout(() => {
        this.createGraph();
        this.schedulePanelStateUpdate();
      }, 100);
      this.schedulePanelStateUpdate();
    }
    if (!this.showCookiePanel) {
      this.cookieService.setCookiePanelState({ open: false, width: 0 });
    }
  }

  async refreshCookies(): Promise<void> {
    await this.loadCookies();
    await this.loadStats();
  }

  formatCookieValue(value: string): string {
    if (value.length > 50) {
      return value.substring(0, 50) + '...';
    }
    return value;
  }

  formatDomain(domain: string): string {
    // Enlever le point initial si présent
    return domain.startsWith('.') ? domain.substring(1) : domain;
  }

  async loadGraphData(): Promise<void> {
    this.graphData = await this.cookieService.getCookieGraphData();
  }

  createGraph(): void {
    if (!this.graphElement) return;

    const element = this.graphElement.nativeElement;
    const width = element.clientWidth;
    const height = element.clientHeight;

    // Nettoyer le contenu précédent
    d3.select(element).selectAll("*").remove();

    if (this.graphData.nodes.length === 0) {
      // Affichage si aucune donnée
      d3.select(element)
        .append('div')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('align-items', 'center')
        .style('justify-content', 'center')
        .style('height', '100%')
        .style('color', '#666')
        .html('<div style="font-size: 24px; margin-bottom: 16px;">🍪</div><div>Aucun cookie trouvé</div>');
      return;
    }

    const svg = d3.select(element)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Créer la simulation de force
    const simulation = d3.forceSimulation(this.graphData.nodes as any)
      .force('link', d3.forceLink(this.graphData.links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));

    // Créer les liens
    const link = svg.append('g')
      .selectAll('line')
      .data(this.graphData.links)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1);

    // Créer les nœuds
    const node = svg.append('g')
      .selectAll('circle')
      .data(this.graphData.nodes)
      .enter()
      .append('circle')
      .attr('r', (d: CookieGraphNode) => d.type === 'domain' ? 8 : 5)
      .attr('fill', (d: CookieGraphNode) => d.type === 'domain' ? '#1976d2' : '#ff9800')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .call(d3.drag<SVGCircleElement, CookieGraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          (d as any).fx = (d as any).x;
          (d as any).fy = (d as any).y;
        })
        .on('drag', (event, d) => {
          (d as any).fx = event.x;
          (d as any).fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          (d as any).fx = null;
          (d as any).fy = null;
        }) as any);

    // Ajouter les labels
    const label = svg.append('g')
      .selectAll('text')
      .data(this.graphData.nodes)
      .enter()
      .append('text')
      .text((d: CookieGraphNode) => d.label.length > 15 ? d.label.substring(0, 15) + '...' : d.label)
      .attr('font-size', '10px')
      .attr('font-family', 'Arial')
      .attr('fill', '#333')
      .attr('text-anchor', 'middle')
      .attr('dy', -10);

    // Tooltip
    node.append('title')
      .text((d: CookieGraphNode) => {
        if (d.type === 'domain') {
          return `Domaine: ${d.label}\nCookies: ${d.cookieCount}`;
        } else {
          return `Cookie: ${d.label}\nDomaine: ${d.domain}`;
        }
      });

    // Mettre à jour les positions à chaque tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);

      label
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);
    });
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.showCookiePanel) {
      this.schedulePanelStateUpdate();
    }
  }

  private schedulePanelStateUpdate(): void {
    requestAnimationFrame(() => {
      if (!this.showCookiePanel) {
        return;
      }

      const width = this.getPanelWidth();
      this.cookieService.setCookiePanelState({ open: true, width });
    });
  }

  private getPanelWidth(): number {
    return this.cookiePanel?.nativeElement?.offsetWidth || 0;
  }
}