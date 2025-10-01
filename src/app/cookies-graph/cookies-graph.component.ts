import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BrowserService, Cookie } from '../browser.service';
import { Subscription } from 'rxjs';
import * as d3 from 'd3';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  type: 'domain' | 'cookie';
  name: string;
  count?: number;
  cookie?: Cookie;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

@Component({
  selector: 'app-cookies-graph',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cookies-graph.component.html',
  styleUrls: ['./cookies-graph.component.css']
})
export class CookiesGraphComponent implements OnInit, OnDestroy {
  @ViewChild('graphContainer', { static: true }) graphContainer!: ElementRef;
  
  private cookies: Cookie[] = [];
  private subscription?: Subscription;
  private svg: any;
  private simulation: any;
  private zoom: any;
  
  selectedNode: GraphNode | null = null;
  stats = {
    totalCookies: 0,
    totalDomains: 0,
    connections: 0
  };

  constructor(
    private browserService: BrowserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.browserService.hideWebView(); // Hide web view when entering graph page
    this.loadCookies();
    
    // Subscribe to cookie changes
    this.subscription = this.browserService.cookies$.subscribe(cookies => {
      this.cookies = cookies;
      this.updateGraph();
    });
  }

  ngOnDestroy(): void {
    this.browserService.showWebView(); // Show web view when leaving graph page
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.simulation) {
      this.simulation.stop();
    }
  }

  async loadCookies(): Promise<void> {
    this.cookies = await this.browserService.getCookies();
    this.updateGraph();
  }

  updateGraph(): void {
    // Clear existing graph
    d3.select(this.graphContainer.nativeElement).selectAll('*').remove();
    
    if (this.cookies.length === 0) return;

    // Prepare data
    const { nodes, links } = this.prepareGraphData();
    
    // Update stats
    this.stats.totalCookies = this.cookies.length;
    this.stats.totalDomains = new Set(this.cookies.map(c => c.domain)).size;
    this.stats.connections = links.length;

    // Create SVG
    const container = this.graphContainer.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    // Add zoom behavior
    const g = this.svg.append('g');
    
    this.zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    
    this.svg.call(this.zoom);

    // Create arrow markers for links
    this.svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#d1d9e0');

    // Create force simulation
    this.simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links)
        .id((d: any) => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('class', 'link')
      .attr('stroke', '#d1d9e0')
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrowhead)');

    // Create nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .call(this.drag(this.simulation) as any);

    // Add circles for nodes
    node.append('circle')
      .attr('r', (d: GraphNode) => d.type === 'domain' ? 25 : 15)
      .attr('fill', (d: GraphNode) => d.type === 'domain' ? '#2c3e50' : '#95a5a6')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (event: any, d: GraphNode) => {
        this.selectedNode = d;
      });

    // Add labels
    node.append('text')
      .text((d: GraphNode) => {
        if (d.type === 'domain') {
          return d.name + (d.count ? ` (${d.count})` : '');
        }
        return d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name;
      })
      .attr('text-anchor', 'middle')
      .attr('dy', (d: GraphNode) => d.type === 'domain' ? 40 : 30)
      .attr('font-size', (d: GraphNode) => d.type === 'domain' ? '12px' : '10px')
      .attr('font-weight', (d: GraphNode) => d.type === 'domain' ? '500' : 'normal')
      .attr('fill', '#2c3e50')
      .style('pointer-events', 'none');

    // Add tooltips
    node.append('title')
      .text((d: GraphNode) => {
        if (d.type === 'domain') {
          return `Domaine: ${d.name}\nCookies: ${d.count}`;
        }
        return `Cookie: ${d.name}\nDomaine: ${d.cookie?.domain}`;
      });

    // Update positions on tick
    this.simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });
  }

  prepareGraphData(): { nodes: GraphNode[], links: GraphLink[] } {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const domainMap = new Map<string, number>();

    // Count cookies per domain
    this.cookies.forEach(cookie => {
      domainMap.set(cookie.domain, (domainMap.get(cookie.domain) || 0) + 1);
    });

    // Create domain nodes
    domainMap.forEach((count, domain) => {
      nodes.push({
        id: `domain-${domain}`,
        type: 'domain',
        name: domain,
        count: count
      });
    });

    // Create cookie nodes and links
    this.cookies.forEach((cookie, index) => {
      const cookieId = `cookie-${index}`;
      nodes.push({
        id: cookieId,
        type: 'cookie',
        name: cookie.name,
        cookie: cookie
      });

      links.push({
        source: `domain-${cookie.domain}`,
        target: cookieId
      });
    });

    return { nodes, links };
  }

  drag(simulation: any): any {
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    
    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    
    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    
    return d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  }

  resetZoom(): void {
    if (this.svg && this.zoom) {
      this.svg.transition()
        .duration(750)
        .call(this.zoom.transform, d3.zoomIdentity);
    }
  }

  navigateToList(): void {
    this.router.navigate(['/cookies']);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  closeDetails(): void {
    this.selectedNode = null;
  }

  formatCookieValue(value: string): string {
    return value.length > 100 ? value.substring(0, 100) + '...' : value;
  }
}
