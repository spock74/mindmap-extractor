import React, { useState, useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
} from 'reactflow';

import { getLayoutedElements } from './utils/layout';
import { JsonData, Triplet } from './types';
import { DEFAULT_JSON_DATA } from './constants';
import { CustomNode } from './components/CustomNode';

const nodeTypes = {
  custom: CustomNode,
};

const LAYOUTS = {
  TB: 'Top to Bottom',
  BT: 'Bottom to Top',
  LR: 'Left to Right',
  RL: 'Right to Left',
  LR_CURVED: 'Left to Right (Curved)',
};

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [jsonInput, setJsonInput] = useState<string>(DEFAULT_JSON_DATA);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [layout, setLayout] = useState<string>('TB');
  const [graphElements, setGraphElements] = useState<{ nodes: Node[], edges: Edge[] } | null>(null);


  const reactFlowInstance = useMemo(() => <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      className="bg-gray-800"
    >
      <Background color="#4A5568" gap={16} />
      <Controls />
      <MiniMap nodeStrokeWidth={3} zoomable pannable />
    </ReactFlow>, [nodes, edges, onNodesChange, onEdgesChange]);

  const handleGenerateGraph = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setGraphElements(null); 
    try {
      const data: JsonData = JSON.parse(jsonInput);
      const triplets = data.triplets;

      const nodeMap = new Map<string, Node>();
      const initialEdges: Edge[] = [];

      triplets.forEach((triplet: Triplet, index: number) => {
        if (triplet.s && triplet.s.label && !nodeMap.has(triplet.s.label)) {
          nodeMap.set(triplet.s.label, {
            id: triplet.s.label,
            type: 'custom',
            data: { label: triplet.s.label, type: triplet.s.type },
            position: { x: 0, y: 0 },
          });
        }
        if (triplet.o && triplet.o.label && !nodeMap.has(triplet.o.label)) {
          nodeMap.set(triplet.o.label, {
            id: triplet.o.label,
            type: 'custom',
            data: { label: triplet.o.label, type: triplet.o.type },
            position: { x: 0, y: 0 },
          });
        }

        if (triplet.s && triplet.s.label && triplet.o && triplet.o.label && triplet.p) {
            initialEdges.push({
                id: `e-${index}-${triplet.s.label}-${triplet.o.label}`,
                source: triplet.s.label,
                target: triplet.o.label,
                label: triplet.p,
                type: 'smoothstep',
                markerEnd: { type: MarkerType.ArrowClosed, color: '#A0AEC0' },
                style: { stroke: '#A0AEC0', strokeWidth: 2 },
                labelStyle: { fill: '#E2E8F0', fontSize: 12 },
                labelBgStyle: { fill: '#2D3748' },
            });
        }
      });
      
      const initialNodes = Array.from(nodeMap.values());
      setGraphElements({ nodes: initialNodes, edges: initialEdges });

    } catch (e) {
      if (e instanceof Error) {
        setError(`Invalid JSON format: ${e.message}`);
      } else {
        setError('An unknown error occurred while parsing JSON.');
      }
      setIsLoading(false);
    }
  }, [jsonInput]);
  
  useEffect(() => {
    if (graphElements) {
        const direction = layout.startsWith('LR') ? 'LR' : layout.startsWith('RL') ? 'RL' : layout.startsWith('BT') ? 'BT' : 'TB';
        
        // Deep copy to prevent mutation issues with dagre
        const copiedNodes = JSON.parse(JSON.stringify(graphElements.nodes));
        const copiedEdges = JSON.parse(JSON.stringify(graphElements.edges));
        
        const nodesWithLayoutData = copiedNodes.map((node: Node) => ({
            ...node,
            data: { ...node.data, layoutDirection: direction }
        }));
        
        const edgesWithUpdatedType = copiedEdges.map((edge: Edge) => ({
            ...edge,
            type: layout === 'LR_CURVED' ? 'default' : 'smoothstep',
        }));

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            nodesWithLayoutData,
            edgesWithUpdatedType,
            direction
        );
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        setIsLoading(false);
    } else {
        setNodes([]);
        setEdges([]);
    }
  }, [graphElements, layout, setNodes, setEdges]);
  
  useEffect(() => {
    handleGenerateGraph();
  }, [handleGenerateGraph]);

  return (
    <div className="flex flex-col md:flex-row h-screen font-sans text-white bg-gray-900">
      <div className="w-full md:w-1/3 lg:w-1/4 p-4 flex flex-col bg-gray-900 border-r border-gray-700 shadow-lg">
        <header className="mb-4">
          <h1 className="text-2xl font-bold text-cyan-400">JSON to Mind Map</h1>
          <p className="text-sm text-gray-400">Visualize JSON triplets as a knowledge graph.</p>
        </header>
        <div className="flex-grow flex flex-col">
          <label htmlFor="json-input" className="text-sm font-medium text-gray-300 mb-2">
            Paste your JSON here:
          </label>
          <textarea
            id="json-input"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="w-full flex-grow p-3 bg-gray-800 border border-gray-600 rounded-md text-gray-200 text-xs font-mono focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition duration-200"
            placeholder="Enter JSON data..."
          />
        </div>
        {error && <div className="mt-4 p-3 bg-red-800 border border-red-600 text-red-200 rounded-md text-sm">{error}</div>}
        <button
          onClick={handleGenerateGraph}
          disabled={isLoading}
          className="mt-4 w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
            'Generate Graph'
          )}
        </button>
        <div className="mt-6 pt-4 border-t border-gray-700">
            <h2 className="text-sm font-medium text-gray-300 mb-3">Layout Direction</h2>
            <div className="grid grid-cols-2 gap-2">
                {(Object.keys(LAYOUTS) as Array<keyof typeof LAYOUTS>).map((dir) => (
                    <button
                        key={dir}
                        onClick={() => setLayout(dir)}
                        className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors duration-200 ${
                            layout === dir
                                ? 'bg-cyan-500 text-white'
                                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        }`}
                    >
                        {LAYOUTS[dir]}
                    </button>
                ))}
            </div>
        </div>
      </div>
      <main className="w-full md:w-2/3 lg:w-3/4 h-full">
        {reactFlowInstance}
      </main>
    </div>
  );
}

export default App;