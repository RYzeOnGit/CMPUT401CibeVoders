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
  const [dimensions, setDimensions] = useState({ width: 0, height: 500 });

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current?.parentElement) {
        const containerWidth = svgRef.current.parentElement.clientWidth - 48; // Account for padding
        const width = Math.max(1000, containerWidth);
        
        // Calculate available height from parent container
        const containerHeight = svgRef.current.parentElement.clientHeight;
        const height = Math.max(400, containerHeight - 20); // Account for small margin
        
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    // Use ResizeObserver to watch parent container size changes
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (svgRef.current?.parentElement) {
      resizeObserver.observe(svgRef.current.parentElement);
    }
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
      resizeObserver.disconnect();
    };
  }, [data.nodes.length, data.links]);

  useEffect(() => {
    if (!svgRef.current || data.nodes.length === 0 || data.links.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    // Color scheme - matching the diagram
    const nodeColors: Record<string, string> = {
      applied: '#3b82f6', // blue
      interview: '#eab308', // yellow
      offer: '#22c55e', // green
      rejected: '#ef4444', // red
      ghosted: '#6b7280', // grey
    };

    const linkColors: Record<string, string> = {
      'applied-interview': '#eab308', // yellow
      'applied-offer': '#22c55e', // green
      'applied-rejected': '#ef4444', // red
      'applied-ghosted': '#6b7280', // grey
    };

    // Prepare data for d3-sankey
    const nodes: any[] = data.nodes.map((node) => ({
      ...node,
    }));

    const links: any[] = data.links.map((link) => ({
      source: link.source,
      target: link.target,
      value: link.value,
    }));

    // Calculate total value for proportional scaling
    const totalValue = links.reduce((sum: number, link: any) => sum + link.value, 0);

    // Create Sankey generator with improved scaling
    const nodeCount = nodes.length;
    
    // Calculate optimal node width based on available space and data
    // Left side has 1 node (Applied - make it wider), right side has (nodeCount - 1) nodes
    const rightSideNodes = nodeCount - 1;
    const availableWidth = width - margin.left - margin.right;
    const defaultNodeWidth = Math.max(20, Math.min(30, availableWidth / 25));
    const appliedNodeWidth = defaultNodeWidth * 3.5; // Make Applied node wide enough to fit text inside
    
    // Calculate optimal node padding based on height and number of nodes
    // Distribute nodes evenly with good spacing
    const availableHeight = height - margin.top - margin.bottom;
    const maxPadding = availableHeight / (rightSideNodes + 1);
    const nodePadding = Math.max(40, Math.min(80, maxPadding));
    
    const sankeyGenerator = sankey<Node, {}>()
      .nodeId((d: any) => d.id)
      .nodeWidth(defaultNodeWidth)
      .nodePadding(nodePadding)
      .extent([
        [margin.left, margin.top],
        [width - margin.right, height - margin.bottom],
      ]);

    // Compute the Sankey layout
    const { nodes: computedNodes, links: computedLinks } = sankeyGenerator({
      nodes,
      links,
    });

    // Make Applied node wider after computation
    const appliedNode = computedNodes.find((n: any) => n.id === 'applied');
    if (appliedNode) {
      const widthIncrease = (appliedNodeWidth - defaultNodeWidth) / 2;
      appliedNode.x0 = appliedNode.x0 - widthIncrease;
      appliedNode.x1 = appliedNode.x1 + widthIncrease;
    }

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
        // Handle both string IDs and node objects
        const sourceId = typeof d.source === 'string' ? d.source : d.source.id;
        const targetId = typeof d.target === 'string' ? d.target : d.target.id;
        const key = `${sourceId}-${targetId}`;
        return linkColors[key] || '#94a3b8';
      })
      .attr('stroke-width', (d: any) => Math.max(4, Math.max(d.width || 4, (d.value / totalValue) * 30)))
      .attr('fill', 'none')
      .attr('opacity', 0.6)
      .style('cursor', 'pointer')
      .on('mouseenter', function (_event, d: any) {
        const baseWidth = Math.max(4, Math.max(d.width || 4, (d.value / totalValue) * 30));
        d3.select(this).attr('opacity', 1).attr('stroke-width', baseWidth + 3);
      })
      .on('mouseleave', function (_event) {
        const d = d3.select(this).datum() as any;
        const baseWidth = Math.max(4, Math.max(d.width || 4, (d.value / totalValue) * 30));
        d3.select(this).attr('opacity', 0.6).attr('stroke-width', baseWidth);
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
      .attr('x', (d: any) => {
        // For Applied node, center text inside the box
        if (d.id === 'applied') {
          return (d.x0 + d.x1) / 2;
        }
        // For other nodes, position outside
        return d.x0 < width / 2 ? d.x1 + 10 : d.x0 - 10;
      })
      .attr('y', (d: any) => (d.y0 + d.y1) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d: any) => {
        // Center text for Applied node
        if (d.id === 'applied') {
          return 'middle';
        }
        // For other nodes, anchor based on position
        return d.x0 < width / 2 ? 'start' : 'end';
      })
      .attr('fill', (d: any) => {
        // White text for Applied node (inside blue box)
        return d.id === 'applied' ? '#ffffff' : '#e5e7eb';
      })
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
        style={{ minHeight: '500px' }}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        preserveAspectRatio="xMidYMid meet"
      />
      <style>{`
        .sankey-tooltip {
          font-family: system-ui, -apple-system, sans-serif;
        }
      `}</style>
    </div>
  );
}

