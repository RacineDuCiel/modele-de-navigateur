import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CookieService, CookieData, CookieGraphNode, CookieGraphLink } from '../cookie.service';
import * as d3 from 'd3';
import type { Force } from 'd3';

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
  MatBadgeModule,
  MatTooltipModule
  ],
  templateUrl: './cookies.component.html',
  styleUrls: ['./cookies.component.css']
})
export class CookiesComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('cookieGraph', { static: false }) graphElement?: ElementRef<HTMLDivElement>;
  @ViewChild('cookiePanel', { static: false }) cookiePanel?: ElementRef<HTMLDivElement>;

  cookies: CookieData[] = [];
  cookieStats: any = null;
  displayedColumns: string[] = ['name', 'domain', 'value', 'secure', 'httpOnly', 'path'];
  
  showCookiePanel = false;
  graphData: {nodes: CookieGraphNode[], links: CookieGraphLink[]} = {nodes: [], links: []};
  graphInitialized = false;

  private panelResizeObserver?: ResizeObserver;
  private panelStateFrameId: number | null = null;
  private zoomBehavior?: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private svgSelection?: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private simulation?: d3.Simulation<CookieGraphNode, CookieGraphLink>;

  constructor(private cookieService: CookieService) { }

  async ngOnInit(): Promise<void> {
    await this.loadCookies();
    await this.loadStats();
  }

  ngAfterViewInit(): void {
    // Le graphique est initialisé à l'ouverture du panel
  }

  ngOnDestroy(): void {
    if (this.panelStateFrameId !== null) {
      cancelAnimationFrame(this.panelStateFrameId);
      this.panelStateFrameId = null;
    }

    this.panelResizeObserver?.disconnect();
    this.panelResizeObserver = undefined;

    this.simulation?.stop();
    this.simulation = undefined;
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
      await this.refreshPanelData();
      this.ensurePanelObserver();
      requestAnimationFrame(() => {
        this.createGraph();
        this.schedulePanelStateUpdate();
      });
    } else {
      this.cookieService.setCookiePanelState({ open: false, width: 0 });
      this.graphInitialized = false;
      this.simulation?.stop();
      this.simulation = undefined;
      this.svgSelection = undefined;
      this.zoomBehavior = undefined;
      if (this.panelStateFrameId !== null) {
        cancelAnimationFrame(this.panelStateFrameId);
        this.panelStateFrameId = null;
      }
    }
  }

  async refreshCookies(): Promise<void> {
    await this.refreshPanelData();
    if (this.showCookiePanel) {
      this.createGraph();
      this.schedulePanelStateUpdate();
    }
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
    if (!this.graphElement) {
      return;
    }

    const host = this.graphElement.nativeElement;
    let width = host.clientWidth;
    let height = host.clientHeight;

    if (width === 0 || height === 0) {
      const rect = host.getBoundingClientRect();
      width = rect.width || 480;
      height = rect.height || 360;
    }

    d3.select(host).selectAll('*').remove();

    if (this.simulation) {
      this.simulation.stop();
      this.simulation = undefined;
    }

    if (this.graphData.nodes.length === 0) {
      this.graphInitialized = false;
      this.svgSelection = undefined;
      this.zoomBehavior = undefined;
      d3.select(host)
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

    const svg = d3.select(host)
      .append('svg')
      .attr('class', 'cookie-graph-svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const zoomLayer = svg.append('g').attr('class', 'cookie-graph-zoom-layer');

    const linksData = this.graphData.links.map(link => ({ ...link }));

    const linkSelection = zoomLayer.append('g')
      .attr('class', 'cookie-graph-links')
      .selectAll('line')
      .data(linksData)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1.2);

    const nodeSelection = zoomLayer.append('g')
      .attr('class', 'cookie-graph-nodes')
      .selectAll('circle')
      .data(this.graphData.nodes)
      .enter()
      .append('circle')
      .attr('r', (d: CookieGraphNode) => d.type === 'domain' ? 10 : 6)
      .attr('fill', (d: CookieGraphNode) => d.type === 'domain' ? '#1976d2' : '#ff9800')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .call(d3.drag<SVGCircleElement, CookieGraphNode>()
        .on('start', (event: d3.D3DragEvent<SVGCircleElement, CookieGraphNode, CookieGraphNode>, d) => {
          event.sourceEvent.stopPropagation();
          if (!event.active && this.simulation) {
            this.simulation.alphaTarget(0.3).restart();
          }
          (d as any).fx = (d as any).x;
          (d as any).fy = (d as any).y;
        })
        .on('drag', (event: d3.D3DragEvent<SVGCircleElement, CookieGraphNode, CookieGraphNode>, d) => {
          (d as any).fx = event.x;
          (d as any).fy = event.y;
        })
        .on('end', (event: d3.D3DragEvent<SVGCircleElement, CookieGraphNode, CookieGraphNode>, d) => {
          if (!event.active && this.simulation) {
            this.simulation.alphaTarget(0);
          }
          (d as any).fx = null;
          (d as any).fy = null;
        }));

    nodeSelection.on('mousedown', (event: MouseEvent) => event.stopPropagation());

    const labelSelection = zoomLayer.append('g')
      .attr('class', 'cookie-graph-labels')
      .selectAll('text')
      .data(this.graphData.nodes)
      .enter()
      .append('text')
      .text((d: CookieGraphNode) => d.label.length > 18 ? `${d.label.substring(0, 18)}…` : d.label)
      .attr('font-size', '11px')
      .attr('font-family', 'Roboto, Arial, sans-serif')
      .attr('fill', '#333')
      .attr('text-anchor', 'middle')
      .attr('dy', -12)
      .attr('pointer-events', 'none');

    nodeSelection.append('title')
      .text((d: CookieGraphNode) => {
        if (d.type === 'domain') {
          return `Domaine: ${d.label}\nCookies: ${d.cookieCount ?? 0}`;
        }
        return `Cookie: ${d.label}\nDomaine: ${d.domain ?? d.rawDomain ?? ''}`;
      });

    const linkForce = d3.forceLink<CookieGraphNode, CookieGraphLink>(linksData)
      .id((d: CookieGraphNode) => d.id)
      .distance(120)
      .strength(0.6);

  const chargeForce = d3.forceManyBody<CookieGraphNode>().strength(-320);
  const collisionForce = d3.forceCollide<CookieGraphNode>().radius(d => d.type === 'domain' ? 32 : 18);
  const centerForce = d3.forceCenter(width / 2, height / 2) as unknown as Force<CookieGraphNode, CookieGraphLink>;

    this.simulation = d3.forceSimulation<CookieGraphNode>(this.graphData.nodes)
      .force('link', linkForce)
      .force('charge', chargeForce)
      .force('center', centerForce)
      .force('collision', collisionForce);

    this.simulation.on('tick', () => {
      linkSelection
        .attr('x1', (d: CookieGraphLink) => this.getNodeCoordinate(d.source, 'x'))
        .attr('y1', (d: CookieGraphLink) => this.getNodeCoordinate(d.source, 'y'))
        .attr('x2', (d: CookieGraphLink) => this.getNodeCoordinate(d.target, 'x'))
        .attr('y2', (d: CookieGraphLink) => this.getNodeCoordinate(d.target, 'y'));

      nodeSelection
        .attr('cx', (d: any) => d.x ?? 0)
        .attr('cy', (d: any) => d.y ?? 0);

      labelSelection
        .attr('x', (d: any) => d.x ?? 0)
        .attr('y', (d: any) => (d.y ?? 0) - 14);
    });

    this.zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 4])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        zoomLayer.attr('transform', event.transform.toString());
      });

    svg.call(this.zoomBehavior as any);
    svg.on('dblclick.zoom', null);

    this.svgSelection = svg;
    this.graphInitialized = true;
  }

  resetGraphView(): void {
    if (!this.svgSelection || !this.zoomBehavior || !this.graphInitialized) {
      return;
    }

    this.svgSelection.transition()
      .duration(350)
      .call(this.zoomBehavior.transform, d3.zoomIdentity);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.showCookiePanel) {
      this.schedulePanelStateUpdate(true);
    }
  }

  private async refreshPanelData(): Promise<void> {
    await Promise.all([
      this.loadCookies(),
      this.loadStats(),
      this.loadGraphData()
    ]);
  }

  private ensurePanelObserver(): void {
    if (this.panelResizeObserver || !this.cookiePanel?.nativeElement) {
      return;
    }

    this.panelResizeObserver = new ResizeObserver(() => {
      if (this.showCookiePanel) {
        this.schedulePanelStateUpdate(true);
      }
    });

    this.panelResizeObserver.observe(this.cookiePanel.nativeElement);
  }

  private schedulePanelStateUpdate(triggerGraphRefresh = false): void {
    if (this.panelStateFrameId !== null) {
      cancelAnimationFrame(this.panelStateFrameId);
    }

    this.panelStateFrameId = requestAnimationFrame(() => {
      this.panelStateFrameId = null;

      if (!this.showCookiePanel) {
        return;
      }

      const width = this.getPanelWidth();
      this.cookieService.setCookiePanelState({ open: true, width });

      if (triggerGraphRefresh) {
        this.createGraph();
      }
    });
  }

  private getPanelWidth(): number {
    return this.cookiePanel?.nativeElement?.offsetWidth ?? 0;
  }

  private getNodeCoordinate(point: string | CookieGraphNode | { x?: number; y?: number }, axis: 'x' | 'y'): number {
    if (typeof point === 'string' || point === undefined || point === null) {
      return 0;
    }

    const coord = (point as any)[axis];
    return typeof coord === 'number' ? coord : 0;
  }
}