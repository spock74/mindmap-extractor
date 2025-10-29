import dagre from 'dagre';
import { Node, Edge } from 'reactflow';
import { NODE_WIDTH, NODE_HEIGHT } from '../constants';

export const getLayoutedElements = (nodes: Node[], edges: Edge[], rankdir: string = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  // Configure the layout direction and spacing
  dagreGraph.setGraph({ rankdir, nodesep: 120, ranksep: 180 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    
    // We need to center the node, as dagre's position refers to the top-left corner.
    node.position = {
      x: nodeWithPosition.x - NODE_WIDTH / 2,
      y: nodeWithPosition.y - NODE_HEIGHT / 2,
    };

    return node;
  });

  return { nodes: layoutedNodes, edges };
};
