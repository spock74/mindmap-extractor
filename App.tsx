import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  Node,
  Edge,
  MarkerType,
  NodeMouseHandler,
} from 'reactflow';
import { ZodError } from 'zod';

import { pdfjs } from 'react-pdf';

import { getLayoutedElements } from './utils/layout';
import { TripletJsonDataSchema, KnowledgeBaseJsonDataSchema, GraphJsonDataSchema, CajalDataSchema } from './utils/schema';
import { TripletJsonData, KnowledgeBaseJsonData, Triplet, HistoryItem, KnowledgeBaseConcept, GraphJsonData, GraphNode, GraphEdge, CajalEvent } from './types';
import { DEFAULT_JSON_DATA, GEMINI_MODELS } from './constants';
import { CustomNode } from './components/CustomNode';
import { useI18n } from './i18n';
import { breakCycles } from './utils/graph';
import { preprocessText } from './utils/text';
import { extractJsonFromString } from './utils/json';
import { ControlPanel } from './components/ControlPanel';
import { TraceabilityDrawer } from './components/TraceabilityDrawer';
import { EdgeLegend } from './components/common/EdgeLegend';
import { HamburgerIcon } from './components/common/Icons';

const readFileContent = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        if (!event.target?.result) {
          return reject(new Error("Failed to read file."));
        }
        if (file.type === 'application/pdf') {
          const pdf = await pdfjs.getDocument(event.target.result as ArrayBuffer).promise;
          let textContent = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const text = await page.getTextContent();
            textContent += text.items.map((s: any) => s.str).join(' ');
          }
          resolve(textContent);
        } else {
          resolve(event.target.result as string);
        }
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);

    if (file.type === 'application/pdf') {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  });
};

const transformKbToTriplets = (data: KnowledgeBaseJsonData): TripletJsonData => {
    const triplets: Triplet[] = [];
    const conceptMap = new Map<string, KnowledgeBaseConcept>(data.kb.map(c => [c.c_id, c]));

    for (const concept of data.kb) {
        if (concept.r_con) {
            for (const relation of concept.r_con) {
                const targetConcept = conceptMap.get(relation.c_id);
                if (targetConcept) {
                    const newTriplet: Triplet = {
                        s: {
                            label: concept.c_con,
                            type: concept.c_rel,
                        },
                        p: relation.typ,
                        o: {
                            label: targetConcept.c_con,
                            type: targetConcept.c_rel,
                        },
                        source_quote: concept.k_nug?.[0]?.s_quo || 'Source from KB', 
                        source_lines: 'Linhas: N/A',
                    };
                    triplets.push(newTriplet);
                }
            }
        }
    }
    return { triplets };
};

const nodeTypes = {
  custom: CustomNode,
};

const getEdgeStyle = (edge: Partial<GraphEdge>) => {
    const styles: React.CSSProperties = {
        stroke: '#A0AEC0',
        strokeWidth: 2,
        strokeDasharray: 'none',
    };

    if (edge.nature === 'positiva') styles.stroke = '#48BB78'; // green
    else if (edge.nature === 'negativa') styles.stroke = '#F56565'; // red
    
    if (edge.strength === 'forte') styles.strokeWidth = 3;
    else if (edge.strength === 'fraca') {
        styles.strokeWidth = 1;
        styles.strokeDasharray = '5 5';
    }
    
    return styles;
};

function App() {
  const { t, language, setLanguage } = useI18n();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [layout, setLayout] = useState<string>('LR_CURVED');

  const [jsonInput, setJsonInput] = useState<string>(DEFAULT_JSON_DATA);
  const [aiJsonOutput, setAiJsonOutput] = useState<string>('');
  const [graphElements, setGraphElements] = useState<{ nodes: Node<GraphNode>[], edges: Edge[] } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  
  const [labelFilter, setLabelFilter] = useState<string>('');
  const [edgeLabelFilter, setEdgeLabelFilter] = useState<string>('');
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set());
  const [selectedNodeIdsForActions, setSelectedNodeIdsForActions] = useState<string[]>([]);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());
  const [activeTrace, setActiveTrace] = useState<GraphNode | null>(null);
  const [preprocessedText, setPreprocessedText] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  
  const [isControlDrawerOpen, setIsControlDrawerOpen] = useState(true);
  const [isPdfDrawerOpen, setIsPdfDrawerOpen] = useState(false);
  
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const generationCancelledRef = useRef<boolean>(false);
  
  const toggleLanguage = () => setLanguage(language === 'pt' ? 'en' : 'pt');

  const generateJsonFromText = useCallback(async (finalPrompt: string, selectedModel: string, isFlexible: boolean): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API key is missing. Please ensure it is set in your environment variables.");
    }
    
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const config = isFlexible ? {} : { responseMimeType: "application/json" as const };

    const response = await ai.models.generateContent({
        model: selectedModel,
        contents: finalPrompt,
        config: config,
    });

    if (response.candidates?.[0]?.finishReason && response.candidates[0].finishReason !== 'STOP') {
        throw new Error(`Generation stopped for reason: ${response.candidates[0].finishReason}. Prompt feedback: ${JSON.stringify(response.promptFeedback)}`);
    }

    if (!response.text) {
        throw new Error("The AI returned an empty response. This could be due to a content safety filter. Check the prompt feedback in the error details.");
    }

    return response.text;
  }, []);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('graphHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error("Failed to parse history from localStorage", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('graphHistory', JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save history to localStorage", e);
    }
  }, [history]);
  
  const getAllDescendants = useCallback((nodeId: string, allEdges: Edge[]): Set<string> => {
    const descendants = new Set<string>();
    const queue: string[] = [nodeId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      
      const children = allEdges.filter(edge => edge.source === currentId).map(edge => edge.target);
      
      for (const childId of children) {
        if (!descendants.has(childId)) {
          descendants.add(childId);
          queue.push(childId);
        }
      }
    }
    return descendants;
  }, []);

  const baseGraphElements = useMemo(() => {
    if (!graphElements) {
        return { nodes: [], edges: [] };
    }

    const hasActiveFilters = labelFilter.trim() !== '' || typeFilters.size > 0 || edgeLabelFilter.trim() !== '';

    const filteredNodesSource = hasActiveFilters
        ? graphElements.nodes.filter(node => {
            const labelMatch = labelFilter.trim() === '' || node.data.label.toLowerCase().includes(labelFilter.trim().toLowerCase());
            const typeMatch = typeFilters.size === 0 || typeFilters.has(node.data.type);
            return labelMatch && typeMatch;
        })
        : graphElements.nodes;

    const visibleNodeIds = new Set(filteredNodesSource.map(n => n.id));

    const filteredEdgesSource = hasActiveFilters
        ? graphElements.edges.filter(edge => {
            const edgeLabelMatch = edgeLabelFilter.trim() === '' || (edge.label && typeof edge.label === 'string' && edge.label.toLowerCase().includes(edgeLabelFilter.trim().toLowerCase()));
            return visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target) && edgeLabelMatch;
        })
        : graphElements.edges;

    const nodesInVisibleEdges = new Set<string>();
    filteredEdgesSource.forEach(edge => {
        nodesInVisibleEdges.add(edge.source);
        nodesInVisibleEdges.add(edge.target);
    });

    const intermediateNodes = edgeLabelFilter.trim() !== ''
        ? filteredNodesSource.filter(node => nodesInVisibleEdges.has(node.id))
        : filteredNodesSource;

    const hiddenByCollapse = new Set<string>();
    collapsedNodeIds.forEach(collapsedId => {
        const descendants = getAllDescendants(collapsedId, graphElements.edges);
        descendants.forEach(id => hiddenByCollapse.add(id));
    });

    const finalFilteredNodes = intermediateNodes.filter(node => !hiddenByCollapse.has(node.id));
    
    const finalVisibleNodeIds = new Set(finalFilteredNodes.map(n => n.id));
    const finalFilteredEdges = filteredEdgesSource.filter(
        edge => finalVisibleNodeIds.has(edge.source) && finalVisibleNodeIds.has(edge.target)
    );

    if (finalFilteredNodes.length === 0 && (hasActiveFilters || collapsedNodeIds.size > 0)) {
        return { nodes: [], edges: [] };
    }

    return { nodes: finalFilteredNodes, edges: finalFilteredEdges };

  }, [graphElements, labelFilter, typeFilters, edgeLabelFilter, collapsedNodeIds, getAllDescendants]);
  
  const displayedGraphElements = useMemo(() => {
    const { nodes: baseNodes, edges: baseEdges } = baseGraphElements;

    if (!hoveredNode) {
        return { nodes: baseNodes, edges: baseEdges };
    }

    const neighborIds = new Set<string>();
    const highlightedEdgeIds = new Set<string>();

    graphElements?.edges.forEach(edge => {
        if (edge.source === hoveredNode) {
            neighborIds.add(edge.target);
            highlightedEdgeIds.add(edge.id);
        } else if (edge.target === hoveredNode) {
            neighborIds.add(edge.source);
            highlightedEdgeIds.add(edge.id);
        }
    });

    const displayedNodes = baseNodes.map(n => {
        const isHovered = n.id === hoveredNode;
        const isNeighbor = neighborIds.has(n.id);
        const isDimmed = !isHovered && !isNeighbor;
        
        return {
            ...n,
            className: `${n.className || ''} ${isDimmed ? 'opacity-20' : ''} ${isHovered ? 'border-cyan-400' : ''} ${isNeighbor ? 'border-white' : ''} transition-all duration-300`,
            data: {
                ...n.data,
                isDimmed,
            }
        };
    });

    const displayedEdges = baseEdges.map(e => {
        const isHighlighted = highlightedEdgeIds.has(e.id);
        return {
            ...e,
            style: {
                ...e.style,
                opacity: isHighlighted ? 1 : 0.2,
                strokeWidth: isHighlighted ? 3 : e.style?.strokeWidth,
            },
            className: 'transition-all duration-300',
        };
    });

    return { nodes: displayedNodes, edges: displayedEdges };

  }, [baseGraphElements, hoveredNode, graphElements]);


  useEffect(() => {
    if (baseGraphElements.nodes.length === 0 && (labelFilter.trim() !== '' || typeFilters.size > 0 || edgeLabelFilter.trim() !== '' || collapsedNodeIds.size > 0)) {
        setNodes([]);
        setEdges([]);
        return;
    }

    if (baseGraphElements.nodes.length > 0) {
        setIsLoading(true);
        setLoadingMessage('loadingMessageApplyingFilters');

        const direction = layout.startsWith('LR') ? 'LR' : layout.startsWith('RL') ? 'RL' : layout.startsWith('BT') ? 'BT' : 'TB';
        
        const copiedNodes = JSON.parse(JSON.stringify(displayedGraphElements.nodes));
        const copiedEdges = JSON.parse(JSON.stringify(displayedGraphElements.edges));
        
        const nodesWithLayoutData = copiedNodes.map((node: Node<GraphNode>) => ({
            ...node,
            data: { 
                ...node.data,
                layoutDirection: direction,
                isCollapsed: collapsedNodeIds.has(node.id),
                onToggle: handleNodeToggle,
                onTrace: handleNodeTrace,
                onUngroup: handleUngroupNode,
                ungroupLabel: t('ungroupButton'),
            }
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
        setLoadingMessage('');
    }
  }, [displayedGraphElements, layout, setNodes, setEdges, collapsedNodeIds, t]);
    
  const processTriplets = (data: TripletJsonData): { nodes: Node<GraphNode>[], edges: Edge[] } => {
    const triplets = data.triplets;
    const nodeMap = new Map<string, Node<GraphNode>>();
    const initialEdges: Edge[] = [];

    triplets.forEach((triplet: Triplet, index: number) => {
        if (triplet.s?.label && !nodeMap.has(triplet.s.label)) {
            nodeMap.set(triplet.s.label, {
                id: triplet.s.label,
                type: 'custom',
                data: { 
                  id: triplet.s.label,
                  label: triplet.s.label, 
                  type: triplet.s.type || 'default', 
                  source_quote: triplet.source_quote,
                  source_lines: triplet.source_lines,
                },
                position: { x: 0, y: 0 },
            });
        }
        if (triplet.o?.label && !nodeMap.has(triplet.o.label)) {
            nodeMap.set(triplet.o.label, {
                id: triplet.o.label,
                type: 'custom',
                data: { 
                  id: triplet.o.label,
                  label: triplet.o.label, 
                  type: triplet.o.type || 'default', 
                  source_quote: triplet.source_quote,
                  source_lines: triplet.source_lines,
                },
                position: { x: 0, y: 0 },
            });
        }
        if (triplet.s?.label && triplet.o?.label && triplet.p) {
            const edgeStyle = getEdgeStyle({});
            initialEdges.push({
                id: `e-${index}-${triplet.s.label}-${triplet.o.label}`,
                source: triplet.s.label,
                target: triplet.o.label,
                label: triplet.p,
                type: 'smoothstep',
                markerEnd: { type: MarkerType.ArrowClosed, color: edgeStyle.stroke as string },
                style: edgeStyle,
                labelStyle: { fill: '#E2E8F0', fontSize: 12 },
                labelBgStyle: { fill: '#2D3748' },
            });
        }
    });
    
    const sourceIds = new Set(initialEdges.map(e => e.source));
    const nodes = Array.from(nodeMap.values()).map(node => ({
      ...node,
      data: {
        ...node.data,
        hasChildren: sourceIds.has(node.id),
      },
    }));

    const edges = breakCycles(nodes, initialEdges);

    return { nodes, edges };
  };

  const processGraphData = (data: GraphJsonData): { nodes: Node<GraphNode>[], edges: Edge[] } => {
    const initialNodesSource: Node<GraphNode>[] = data.result.nodes.map(node => ({
        id: node.id,
        type: 'custom',
        data: { 
          id: node.id,
          label: node.label, 
          type: node.type || 'default', 
          source_quote: node.source_quote,
          source_lines: node.source_lines,
        },
        position: { x: 0, y: 0 },
    }));

    const initialEdges: Edge[] = data.result.edges.map(edge => {
        const edgeStyle = getEdgeStyle(edge);
        return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: edge.label,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed, color: edgeStyle.stroke as string },
            style: edgeStyle,
            labelStyle: { fill: '#E2E8F0', fontSize: 12 },
            labelBgStyle: { fill: '#2D3748' },
        };
    });
    
    const sourceIds = new Set(initialEdges.map(e => e.source));
    const initialNodes = initialNodesSource.map(node => ({
        ...node,
        data: {
            ...node.data,
            hasChildren: sourceIds.has(node.id),
        },
    }));

    const edges = breakCycles(initialNodes, initialEdges);

    return { nodes: initialNodes, edges };
  };
    
  const processCajalData = useCallback((data: CajalEvent[]): { nodes: Node<GraphNode>[], edges: Edge[] } => {
    const nodeMap = new Map<string, Node<GraphNode>>();
    const initialEdges: Edge[] = [];

    data.forEach((event, index) => {
        const agent = event.hasAgent;
        const affected = event.hasAffectedEntity;

        if (agent.label && !nodeMap.has(agent.label)) {
            nodeMap.set(agent.label, {
                id: agent.label,
                type: 'custom',
                data: {
                    id: agent.label,
                    label: agent.label,
                    type: 'agent',
                    source_quote: event.supportingQuote,
                    source_lines: 'N/A',
                },
                position: { x: 0, y: 0 },
            });
        }
        if (affected.label && !nodeMap.has(affected.label)) {
            nodeMap.set(affected.label, {
                id: affected.label,
                type: 'custom',
                data: {
                    id: affected.label,
                    label: affected.label,
                    type: 'affectedEntity',
                    source_quote: event.supportingQuote,
                    source_lines: 'N/A',
                },
                position: { x: 0, y: 0 },
            });
        }

        if (agent.label && affected.label) {
            let strength: 'forte' | 'moderada' | 'fraca' = 'moderada';
            if (event.relationQualifier === 'explicitly causal' || event.relationQualifier === 'strongly implied causal') strength = 'forte';
            else if (event.relationQualifier === 'weakly implied causal') strength = 'fraca';

            let nature: 'positiva' | 'negativa' | 'neutra' = 'neutra';
            const rel = event.hasCausalRelationship.toLowerCase();
            if (rel.includes('increase') || rel.includes('promote') || rel.includes('cause')) nature = 'positiva';
            else if (rel.includes('decrease') || rel.includes('inhibit') || rel.includes('prevent')) nature = 'negativa';

            const edgeStyle = getEdgeStyle({ strength, nature });

            initialEdges.push({
                id: `e-${index}-${agent.label}-${affected.label}`,
                source: agent.label,
                target: affected.label,
                label: event.hasCausalRelationship.replace('cajal:', ''),
                type: 'smoothstep',
                markerEnd: { type: MarkerType.ArrowClosed, color: edgeStyle.stroke as string },
                style: edgeStyle,
                labelStyle: { fill: '#E2E8F0', fontSize: 12 },
                labelBgStyle: { fill: '#2D3748' },
            });
        }
    });
    
    const sourceIds = new Set(initialEdges.map(e => e.source));
    const nodes = Array.from(nodeMap.values()).map(node => ({
      ...node,
      data: {
        ...node.data,
        hasChildren: sourceIds.has(node.id),
      },
    }));

    const edges = breakCycles(nodes, initialEdges);
    return { nodes, edges };
  }, []);

  const processJsonAndSetGraph = useCallback((jsonString: string, options: { preservePreprocessedText?: boolean } = {}): string | null => {
    setError(null);
    setGraphElements(null);
    if (!options.preservePreprocessedText) {
      setPreprocessedText(null);
      setPdfFile(null);
    }
    try {
      const cleanJsonString = extractJsonFromString(jsonString);
      
      let parsedJson = JSON.parse(cleanJsonString);
      let finalJsonToStore = cleanJsonString;
      let processed = false;
      
      if (Array.isArray(parsedJson)) {
          try {
              const cajalData = CajalDataSchema.parse(parsedJson);
              const { nodes, edges } = processCajalData(cajalData);
              setGraphElements({ nodes, edges });
              finalJsonToStore = JSON.stringify(cajalData, null, 2);
              processed = true;
          } catch (zodError) {
              parsedJson = { triplets: parsedJson };
              finalJsonToStore = JSON.stringify(parsedJson, null, 2);
          }
      } else if (parsedJson.causalEvents && Array.isArray(parsedJson.causalEvents)) {
          try {
              const cajalData = CajalDataSchema.parse(parsedJson.causalEvents);
              const { nodes, edges } = processCajalData(cajalData);
              setGraphElements({ nodes, edges });
              finalJsonToStore = JSON.stringify(cajalData, null, 2);
              processed = true;
          } catch (zodError) {
          }
      }

      if (!processed) {
        if ('result' in parsedJson) {
          const nodeIds = new Set(parsedJson.result.nodes.map((n: {id: string}) => n.id));
          parsedJson.result.edges = parsedJson.result.edges.filter((e: {source: string, target: string}) =>
              e.source && e.target && nodeIds.has(e.source) && nodeIds.has(e.target)
          );
          const graphData: GraphJsonData = GraphJsonDataSchema.parse(parsedJson);
          const { nodes, edges } = processGraphData(graphData);
          setGraphElements({ nodes, edges });
        } else if ('kb' in parsedJson) {
          const kbData: KnowledgeBaseJsonData = KnowledgeBaseJsonDataSchema.parse(parsedJson);
          const tripletData = transformKbToTriplets(kbData);
          const { nodes, edges } = processTriplets(tripletData);
          setGraphElements({ nodes, edges });
          finalJsonToStore = JSON.stringify(tripletData, null, 2);
        } else if ('triplets' in parsedJson) {
          const tripletData = TripletJsonDataSchema.parse(parsedJson);
          const { nodes, edges } = processTriplets(tripletData);
          setGraphElements({ nodes, edges });
          finalJsonToStore = JSON.stringify(tripletData, null, 2);
        } else {
          throw new Error("Invalid JSON structure. The root key must be 'result', 'triplets', or 'kb', or an array of Causal Events.");
        }
      }
      
      setLabelFilter('');
      setEdgeLabelFilter('');
      setTypeFilters(new Set());
      setSelectedNodeIdsForActions([]);
      setCollapsedNodeIds(new Set());
      setActiveTrace(null);
      return finalJsonToStore;
    } catch (e) {
      let errorMessage = 'An unknown error occurred.';
      if (e instanceof ZodError) {
        const formattedErrors = e.issues.map(err => `At '${err.path.join('.')}': ${err.message}`).join('\n');
        errorMessage = t('errorJsonValidation', { errors: formattedErrors });
      } else if (e instanceof SyntaxError) {
        errorMessage = t('errorInvalidJson', { error: e.message });
      } else if (e instanceof Error) {
        errorMessage = e.message;
      }
      setError(errorMessage);
      setIsLoading(false);
      setLoadingMessage('');
      return null;
    }
  }, [t, processCajalData]);

  const handleGenerateGraphFromJson = useCallback(() => {
    if (isLoading || !jsonInput.trim()) return;
    const finalJsonString = processJsonAndSetGraph(jsonInput);
    if (finalJsonString) {
        setJsonInput(finalJsonString);
        setAiJsonOutput(finalJsonString);
    }
  }, [isLoading, jsonInput, processJsonAndSetGraph]);
  
  const handleFileGenerate = async (
    selectedFile: File, prompt: string, model: string, maxConcepts: number, useFlexibleSchema: boolean
    ) => {
    if (!selectedFile) return;
    
    setIsLoading(true);
    setError(null);
    setAiJsonOutput('');
    generationCancelledRef.current = false;

    try {
      setLoadingMessage("loadingMessageReadingFile");
      const fileContent = await readFileContent(selectedFile);
      const processedContent = preprocessText(fileContent);
      setPreprocessedText(processedContent);
      
      if (generationCancelledRef.current) return;
      
      setLoadingMessage("loadingMessageGenerating");
      const finalPrompt = prompt
        .replace('{TEXTO_DE_ENTRADA}', processedContent)
        .replace('{TEXTOS_INTEGRAIS_DOS_ARTIGOS}', processedContent)
        .replace('{MAX_CONCEITOS}', String(maxConcepts))
        .replace('{{article_text}}', processedContent);
        
      const rawAiResponse = await generateJsonFromText(finalPrompt, model, useFlexibleSchema);
      
      if (generationCancelledRef.current) return;
      
      setLoadingMessage("loadingMessageProcessing");
      const finalJsonString = processJsonAndSetGraph(rawAiResponse, { preservePreprocessedText: true });

      if (finalJsonString) {
        setAiJsonOutput(finalJsonString);
        const newHistoryItem: HistoryItem = {
          id: `hist-${Date.now()}`,
          filename: selectedFile.name,
          prompt: prompt,
          jsonString: finalJsonString,
          timestamp: new Date().toISOString(),
        };
        setHistory(prev => [newHistoryItem, ...prev]);
        setJsonInput(finalJsonString);
      } else {
        setAiJsonOutput(rawAiResponse);
      }
    } catch (e) {
      if (generationCancelledRef.current) {
        setError(t('errorGenerationCancelled'));
      } else {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        setError(t('errorGenerationFailed', { error: errorMessage }));
      }
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  };
  
  const handleStopGenerating = () => {
    generationCancelledRef.current = true;
    setIsLoading(false);
    setLoadingMessage('');
    setError(t('errorGenerationCancelled'));
  };

  const handleSelectHistoryItem = useCallback((item: HistoryItem) => {
    setJsonInput(item.jsonString);
    setAiJsonOutput(item.jsonString);
    processJsonAndSetGraph(item.jsonString);
  }, [processJsonAndSetGraph]);

  const handleDeleteHistoryItem = useCallback((id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  }, []);
  
  const handleTypeFilterChange = useCallback((type: string) => {
    setTypeFilters(prev => {
        const newSet = new Set(prev);
        if (newSet.has(type)) {
            newSet.delete(type);
        } else {
            newSet.add(type);
        }
        return newSet;
    });
  }, []);

  const handleClearFilters = useCallback(() => {
      setLabelFilter('');
      setEdgeLabelFilter('');
      setTypeFilters(new Set());
      setSelectedNodeIdsForActions([]);
      setCollapsedNodeIds(new Set());
  }, []);

  const handleSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
    setSelectedNodeIdsForActions(nodes.map(n => n.id));
  }, []);

  const handleDeleteSelectedNodes = useCallback(() => {
      if (!graphElements) return;
      const selectedIdsSet = new Set(selectedNodeIdsForActions);
      const remainingNodes = graphElements.nodes.filter(n => !selectedIdsSet.has(n.id));
      const remainingEdges = graphElements.edges.filter(e => !selectedIdsSet.has(e.source) && !selectedIdsSet.has(e.target));
      setGraphElements({ nodes: remainingNodes, edges: remainingEdges });
      setSelectedNodeIdsForActions([]);
  }, [selectedNodeIdsForActions, graphElements]);
    
  const handleCollapseSelectedNodes = useCallback(() => {
    if (!graphElements) return;
    setCollapsedNodeIds(prev => {
        const newSet = new Set(prev);
        selectedNodeIdsForActions.forEach(id => {
            const node = graphElements.nodes.find(n => n.id === id);
            if (node?.data.hasChildren) newSet.add(id);
        });
        return newSet;
    });
  }, [selectedNodeIdsForActions, graphElements]);

  const handleExpandSelectedNodes = useCallback(() => {
    setCollapsedNodeIds(prev => {
        const newSet = new Set(prev);
        selectedNodeIdsForActions.forEach(id => newSet.delete(id));
        return newSet;
    });
  }, [selectedNodeIdsForActions]);

  const handleGroupSelectedNodes = useCallback(() => {
    if (selectedNodeIdsForActions.length < 2 || !graphElements) return;
    const groupName = window.prompt(t('groupNamePrompt'));
    if (!groupName) return;

    const groupId = `group-${Date.now()}`;
    const selectedNodes = graphElements.nodes.filter(n => selectedNodeIdsForActions.includes(n.id));
    
    const avgX = selectedNodes.reduce((sum, n) => sum + (n.position?.x || 0), 0) / selectedNodes.length;
    const avgY = selectedNodes.reduce((sum, n) => sum + (n.position?.y || 0), 0) / selectedNodes.length;
    
    const groupNode: Node<GraphNode> = {
      id: groupId,
      type: 'custom',
      data: { id: groupId, label: groupName, type: 'group' },
      position: { x: avgX, y: avgY },
    };

    const updatedNodes = graphElements.nodes.map(n => {
      if (selectedNodeIdsForActions.includes(n.id)) {
        return { ...n, parentNode: groupId, extent: 'parent' as const };
      }
      return n;
    });

    setGraphElements(prev => ({ ...prev!, nodes: [...updatedNodes, groupNode] }));
    setSelectedNodeIdsForActions([]);
  }, [selectedNodeIdsForActions, graphElements, t]);

  const handleUngroupNode = useCallback((groupId: string) => {
    if (!graphElements) return;
    const updatedNodes = graphElements.nodes
        .filter(n => n.id !== groupId)
        .map(n => {
            if (n.parentNode === groupId) {
                const { parentNode, ...rest } = n;
                return rest;
            }
            return n;
        });
    setGraphElements(prev => ({ ...prev!, nodes: updatedNodes }));
  }, [graphElements]);

  const handleNodeToggle = useCallback((nodeId: string) => {
    setCollapsedNodeIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(nodeId)) newSet.delete(nodeId);
        else newSet.add(nodeId);
        return newSet;
    });
  }, []);
    
  const handleNodeTrace = useCallback((nodeData: GraphNode) => {
    setActiveTrace(nodeData);
    setIsPdfDrawerOpen(true);
  }, []);

  const onNodeMouseEnter: NodeMouseHandler = useCallback((event, node) => setHoveredNode(node.id), []);
  const onNodeMouseLeave: NodeMouseHandler = useCallback(() => setHoveredNode(null), []);

  const reactFlowInstance = useMemo(() => (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onSelectionChange={handleSelectionChange}
      onNodeMouseEnter={onNodeMouseEnter}
      onNodeMouseLeave={onNodeMouseLeave}
      nodeTypes={nodeTypes}
      fitView
      className="bg-gray-800"
      multiSelectionKeyCode="Shift"
      selectionOnDrag={true}
    >
      <Background color="#4A5568" gap={16} />
      <Controls />
      {graphElements && graphElements.edges.length > 0 && <EdgeLegend />}
    </ReactFlow>
  ), [nodes, edges, onNodesChange, onEdgesChange, handleSelectionChange, onNodeMouseEnter, onNodeMouseLeave, graphElements]);

  return (
    <div className="h-screen font-sans text-white bg-gray-900 relative overflow-hidden">
        {!isControlDrawerOpen && (
          <button
            onClick={() => setIsControlDrawerOpen(true)}
            className="absolute top-4 left-4 z-30 p-2 bg-gray-800/70 hover:bg-gray-700/90 rounded-full text-white transition-all duration-300"
            aria-label={t('openPanel')}
            title={t('openPanel')}
          >
            <HamburgerIcon />
          </button>
        )}
      
      <ControlPanel
        isOpen={isControlDrawerOpen}
        onClose={() => setIsControlDrawerOpen(false)}
        language={language}
        toggleLanguage={toggleLanguage}
        jsonInput={jsonInput}
        setJsonInput={setJsonInput}
        aiJsonOutput={aiJsonOutput}
        history={history}
        handleSelectHistoryItem={handleSelectHistoryItem}
        handleDeleteHistoryItem={handleDeleteHistoryItem}
        error={error}
        isLoading={isLoading}
        loadingMessage={loadingMessage}
        layout={layout}
        setLayout={setLayout}
        handleGenerateGraphFromJson={handleGenerateGraphFromJson}
        handleFileGenerate={handleFileGenerate}
        handleStopGenerating={handleStopGenerating}
        pdfFile={pdfFile}
        setPdfFile={setPdfFile}
        setIsPdfDrawerOpen={setIsPdfDrawerOpen}
        labelFilter={labelFilter}
        setLabelFilter={setLabelFilter}
        edgeLabelFilter={edgeLabelFilter}
        setEdgeLabelFilter={setEdgeLabelFilter}
        typeFilters={typeFilters}
        availableTypes={useMemo(() => {
            if (!graphElements?.nodes) return [];
            const types = new Set<string>();
            graphElements.nodes.forEach(node => {
                if (node.data.type) types.add(node.data.type);
            });
            return Array.from(types).sort();
        }, [graphElements])}
        handleTypeFilterChange={handleTypeFilterChange}
        handleClearFilters={handleClearFilters}
        selectedNodeIdsForActions={selectedNodeIdsForActions}
        canCollapseSelected={useMemo(() => {
            if (!graphElements || selectedNodeIdsForActions.length === 0) return false;
            return selectedNodeIdsForActions.some(id => graphElements.nodes.find(n => n.id === id)?.data.hasChildren);
        }, [selectedNodeIdsForActions, graphElements])}
        canExpandSelected={useMemo(() => {
            if (selectedNodeIdsForActions.length === 0 || collapsedNodeIds.size === 0) return false;
            return selectedNodeIdsForActions.some(id => collapsedNodeIds.has(id));
        }, [selectedNodeIdsForActions, collapsedNodeIds])}
        handleCollapseSelectedNodes={handleCollapseSelectedNodes}
        handleExpandSelectedNodes={handleExpandSelectedNodes}
        handleGroupSelectedNodes={handleGroupSelectedNodes}
        handleDeleteSelectedNodes={handleDeleteSelectedNodes}
      />

      <main className="w-full h-full">
        {reactFlowInstance}
      </main>

      <TraceabilityDrawer 
        isOpen={isPdfDrawerOpen}
        setIsOpen={setIsPdfDrawerOpen}
        activeTrace={activeTrace}
        setActiveTrace={setActiveTrace}
        pdfFile={pdfFile}
        preprocessedText={preprocessedText}
      />
    </div> 
  );
}

export default App;