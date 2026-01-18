import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
// @ts-ignore - d3-sankey doesn't have types
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';

interface Node {
  id: string;
  label: string;
}

interface Link {
  source: string;
  target: string;
  value: number;
}

interface SankeyData {
  nodes: Node[];
  links: Link[];
}

interface SankeyDiagramProps {
  data: SankeyData;
}


export default function SankeyDiagram({ data }: SankeyDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 600 });

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current?.parentElement) {
        const width = svgRef.current.parentElement.clientWidth - 48; // Account for padding
        setDimensions({ width: Math.max(800, width), height: 600 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!svgRef.current || data.nodes.length === 0 || data.links.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    // Color scheme
    const nodeColors: Record<string, string> = {
      applied: '#3b82f6', // blue
      interview: '#eab308', // yellow
      offer: '#22c55e', // green
      rejected: '#ef4444', // red
    };

    const linkColors: Record<string, string> = {
      'applied-interview': '#60a5fa',
      'applied-rejected': '#f87171',
      'interview-offer': '#4ade80',
      'interview-rejected': '#fb923c',
    };

    // Create Sankey generator
    const sankeyGenerator = sankey<Node, {}>()
      .nodeId((d: any) => d.id)
      .nodeWidth(20)
      .nodePadding(40)
      .extent([
        [margin.left, margin.top],
        [width - margin.right, height - margin.bottom],
      ]);

    // Prepare data for d3-sankey
    const nodes: any[] = data.nodes.map((node) => ({
      ...node,
    }));

    const links: any[] = data.links.map((link) => ({
      source: link.source,
      target: link.target,
      value: link.value,
    }));

    // Compute the Sankey layout
    const { nodes: computedNodes, links: computedLinks } = sankeyGenerator({
      nodes,
      links,
    });

    // Create groups for links and nodes
    const linkGroup = svg.append('g').attr('class', 'links');
    const nodeGroup = svg.append('g').attr('class', 'nodes');
    const labelGroup = svg.append('g').attr('class', 'labels');

    // Draw links
    const link = linkGroup
      .selectAll('path')
      .data(computedLinks)
      .enter()
      .append('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', (d: any) => {
        const key = `${d.source.id}-${d.target.id}`;
        return linkColors[key] || '#94a3b8';
      })
      .attr('stroke-width', (d: any) => Math.max(2, d.width))
      .attr('fill', 'none')
      .attr('opacity', 0.6)
      .style('cursor', 'pointer')
      .on('mouseenter', function (_event, d: any) {
        d3.select(this).attr('opacity', 1).attr('stroke-width', Math.max(3, (d.width || 2) + 2));
      })
      .on('mouseleave', function (_event) {
        const d = d3.select(this).datum() as any;
        d3.select(this).attr('opacity', 0.6).attr('stroke-width', Math.max(2, d.width || 2));
      });

    // Draw nodes
    const node = nodeGroup
      .selectAll('rect')
      .data(computedNodes)
      .enter()
      .append('rect')
      .attr('x', (d: any) => d.x0)
      .attr('y', (d: any) => d.y0)
      .attr('height', (d: any) => d.y1 - d.y0)
      .attr('width', (d: any) => d.x1 - d.x0)
      .attr('fill', (d: any) => nodeColors[d.id] || '#64748b')
      .attr('rx', 4)
      .style('cursor', 'pointer')
      .on('mouseenter', function () {
        d3.select(this).attr('opacity', 0.8);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 1);
      });

    // Add labels
    labelGroup
      .selectAll('text')
      .data(computedNodes)
      .enter()
      .append('text')
      .attr('x', (d: any) => (d.x0 < width / 2 ? d.x1 + 10 : d.x0 - 10))
      .attr('y', (d: any) => (d.y0 + d.y1) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d: any) => (d.x0 < width / 2 ? 'start' : 'end'))
      .attr('fill', '#e5e7eb')
      .attr('font-size', '14px')
      .attr('font-weight', '500')
      .text((d: any) => {
        const nodeData = data.nodes.find((n) => n.id === d.id);
        return nodeData?.label || d.id;
      });

    // Add value labels on links (simplified - show on hover via tooltip instead)

    // Tooltip
    const tooltip = d3
      .select('body')
      .append('div')
      .attr('class', 'sankey-tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.9)')
      .style('color', 'white')
      .style('padding', '8px 12px')
      .style('border-radius', '6px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');

    link
      .on('mouseover', function (event: MouseEvent, d: any) {
        const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
        const targetId = typeof d.target === 'string' ? d.target : d.target.id;
        tooltip
          .style('opacity', 1)
          .html(
            `<strong>${data.nodes.find((n) => n.id === sourceId)?.label}</strong> → <strong>${data.nodes.find((n) => n.id === targetId)?.label}</strong><br/>Applications: ${Math.round(d.value)}`
          )
          .style('left', event.pageX + 10 + 'px')
          .style('top', event.pageY - 10 + 'px');
      })
      .on('mousemove', function (event: MouseEvent) {
        tooltip.style('left', event.pageX + 10 + 'px').style('top', event.pageY - 10 + 'px');
      })
      .on('mouseout', function () {
        tooltip.style('opacity', 0);
      });

    node
      .on('mouseover', function (event: MouseEvent, d: any) {
        const nodeId = typeof d === 'string' ? d : d.id;
        const totalIn = computedLinks
          .filter((l: any) => {
            const targetId = typeof l.target === 'string' ? l.target : l.target.id;
            return targetId === nodeId;
          })
          .reduce((sum: number, l: any) => sum + l.value, 0);
        const totalOut = computedLinks
          .filter((l: any) => {
            const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
            return sourceId === nodeId;
          })
          .reduce((sum: number, l: any) => sum + l.value, 0);

        tooltip
          .style('opacity', 1)
          .html(
            `<strong>${data.nodes.find((n) => n.id === nodeId)?.label}</strong><br/>Incoming: ${Math.round(totalIn)}<br/>Outgoing: ${Math.round(totalOut)}`
          )
          .style('left', event.pageX + 10 + 'px')
          .style('top', event.pageY - 10 + 'px');
      })
      .on('mousemove', function (event: MouseEvent) {
        tooltip.style('left', event.pageX + 10 + 'px').style('top', event.pageY - 10 + 'px');
      })
      .on('mouseout', function () {
        tooltip.style('opacity', 0);
      });

    return () => {
      tooltip.remove();
    };
  }, [data, dimensions]);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full"
        style={{ minHeight: '600px' }}
      />
      <style>{`
        .sankey-tooltip {
          font-family: system-ui, -apple-system, sans-serif;
        }
      `}</style>
    </div>
  );
}

