


import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
  Position,
} from 'reactflow';
import * as pdfjsLib from 'pdfjs-dist';
import { ZodError } from 'zod';

import { getLayoutedElements } from './utils/layout';
import { TripletJsonDataSchema, KnowledgeBaseJsonDataSchema, GraphJsonDataSchema } from './utils/schema';
import { TripletJsonData, KnowledgeBaseJsonData, Triplet, HistoryItem, KnowledgeBaseConcept, GraphJsonData, GraphNode } from './types';
import { DEFAULT_JSON_DATA, GEMINI_MODELS, NODE_TYPE_COLORS, LAYOUTS, PROMPT_TEMPLATES, NODE_WIDTH } from './constants';
import { CustomNode } from './components/CustomNode';
import { PdfViewer } from './components/PdfViewer';
import { useI18n } from './i18n';
import { breakCycles } from './utils/graph';
import { preprocessText, parseLineNumbers } from './utils/text';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.min.mjs';

const readFileContent = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        if (!event.target?.result) {
          return reject(new Error("Failed to read file."));
        }
        if (file.type === 'application/pdf') {
          const pdf = await pdfjsLib.getDocument(event.target.result as ArrayBuffer).promise;
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

function App() {
  const { t, language, setLanguage } = useI18n();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [layout, setLayout] = useState<string>('LR_CURVED');

  const [jsonInput, setJsonInput] = useState<string>(DEFAULT_JSON_DATA);
  const [graphElements, setGraphElements] = useState<{ nodes: Node<GraphNode>[], edges: Edge[] } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'generate' | 'manual' | 'history'>('generate');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  
  const [labelFilter, setLabelFilter] = useState<string>('');
  const [edgeLabelFilter, setEdgeLabelFilter] = useState<string>('');
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set());
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());
  const [activeTrace, setActiveTrace] = useState<GraphNode | null>(null);
  const [preprocessedText, setPreprocessedText] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  
  const [isResizing, setIsResizing] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(window.innerWidth / 3);
  const drawerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing) {
        const newWidth = window.innerWidth - e.clientX;
        const minWidth = 300;
        const maxWidth = window.innerWidth * 0.8;
        if (newWidth > minWidth && newWidth < maxWidth) {
            setDrawerWidth(newWidth);
        }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    } else {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);


  const availableTypes = useMemo(() => {
    if (!graphElements?.nodes) return [];
    const types = new Set<string>();
    graphElements.nodes.forEach(node => {
        if (node.data.type) {
            types.add(node.data.type);
        }
    });
    return Array.from(types).sort();
  }, [graphElements]);


  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [model, setModel] = useState<string>(GEMINI_MODELS[1]);
  const [maxConcepts, setMaxConcepts] = useState<number>(10);
  const generationCancelledRef = useRef<boolean>(false);
  const availablePrompts = useMemo(() => PROMPT_TEMPLATES, []);
  

  const generateJsonFromText = useCallback(async (finalPrompt: string, selectedModel: string): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API key is missing. Please ensure it is set in your environment variables.");
    }
    
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const response = await ai.models.generateContent({
        model: selectedModel,
        contents: finalPrompt,
        config: {
            responseMimeType: "application/json",
        },
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

  useEffect(() => {
    if (!graphElements) {
      setNodes([]);
      setEdges([]);
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage('loadingMessageApplyingFilters');
    
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
        setNodes([]);
        setEdges([]);
        setIsLoading(false);
        setLoadingMessage('');
        return;
    }

    const direction = layout.startsWith('LR') ? 'LR' : layout.startsWith('RL') ? 'RL' : layout.startsWith('BT') ? 'BT' : 'TB';
      
    const copiedNodes = JSON.parse(JSON.stringify(finalFilteredNodes));
    const copiedEdges = JSON.parse(JSON.stringify(finalFilteredEdges));
      
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

  }, [graphElements, layout, labelFilter, typeFilters, edgeLabelFilter, collapsedNodeIds, setNodes, setEdges, getAllDescendants, t]);

    
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

    const initialEdges: Edge[] = data.result.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#A0AEC0' },
        style: { stroke: '#A0AEC0', strokeWidth: 2 },
        labelStyle: { fill: '#E2E8F0', fontSize: 12 },
        labelBgStyle: { fill: '#2D3748' },
    }));
    
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
    
  const processJsonAndSetGraph = useCallback((jsonString: string, options: { preservePreprocessedText?: boolean } = {}): string | null => {
    setError(null);
    setGraphElements(null);
    if (!options.preservePreprocessedText) {
      setPreprocessedText(null);
      setPdfFile(null);
    }
    try {
      let cleanJsonString = jsonString.trim();
      const markdownMatch = /```(?:json)?\s*([\s\S]*?)\s*```/.exec(cleanJsonString);
      if (markdownMatch) {
        cleanJsonString = markdownMatch[1];
      }
      
      let parsedJson = JSON.parse(cleanJsonString);
      let finalJsonToStore = cleanJsonString;

      if (Array.isArray(parsedJson)) {
        parsedJson = { triplets: parsedJson };
        finalJsonToStore = JSON.stringify(parsedJson, null, 2);
      } else if (typeof parsedJson === 'object' && parsedJson !== null && !('result' in parsedJson) && !('kb' in parsedJson) && !('triplets' in parsedJson)) {
        const keys = Object.keys(parsedJson);
        if (keys.length === 1 && Array.isArray(parsedJson[keys[0]])) {
            parsedJson = { triplets: parsedJson[keys[0]] };
            finalJsonToStore = JSON.stringify(parsedJson, null, 2);
        } else if ('nodes' in parsedJson && 'edges' in parsedJson) {
            const adaptedGraphData = {
                result: {
                    title: parsedJson.title || 'Generated Graph',
                    nodes: parsedJson.nodes,
                    edges: parsedJson.edges,
                }
            };
            parsedJson = adaptedGraphData;
            finalJsonToStore = JSON.stringify(parsedJson, null, 2);
        }
      }
      
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
        throw new Error("Invalid JSON structure. The root key must be 'result', 'triplets', or 'kb'.");
      }
      
      setLabelFilter('');
      setEdgeLabelFilter('');
      setTypeFilters(new Set());
      setSelectedNodeIds([]);
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
  }, [t]);
  
  const canCollapseSelected = useMemo(() => {
    if (!graphElements || selectedNodeIds.length === 0) return false;
    return selectedNodeIds.some(id => {
        const node = graphElements.nodes.find(n => n.id === id);
        return node?.data.hasChildren;
    });
  }, [selectedNodeIds, graphElements]);

  const canExpandSelected = useMemo(() => {
    if (selectedNodeIds.length === 0 || collapsedNodeIds.size === 0) return false;
    return selectedNodeIds.some(id => collapsedNodeIds.has(id));
  }, [selectedNodeIds, collapsedNodeIds]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file && file.type === 'application/pdf') {
        setPdfFile(file);
    } else {
        setPdfFile(null);
    }
  };

  const handleFileGenerate = async () => {
    if (!selectedFile) return;
    
    setIsLoading(true);
    setError(null);
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
        .replace('{MAX_CONCEITOS}', String(maxConcepts));
        
      const jsonString = await generateJsonFromText(finalPrompt, model);
      
      if (generationCancelledRef.current) return;
      
      setLoadingMessage("loadingMessageProcessing");
      const finalJsonString = processJsonAndSetGraph(jsonString, { preservePreprocessedText: true });

      if (finalJsonString) {
        const newHistoryItem: HistoryItem = {
          id: `hist-${Date.now()}`,
          filename: selectedFile.name,
          prompt: prompt,
          jsonString: finalJsonString,
          timestamp: new Date().toISOString(),
        };
        setHistory(prev => [newHistoryItem, ...prev]);
        setJsonInput(finalJsonString);
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
    processJsonAndSetGraph(item.jsonString);
    setActiveTab('manual');
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
      setSelectedNodeIds([]);
      setCollapsedNodeIds(new Set());
  }, []);

  const handleSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
    setSelectedNodeIds(nodes.map(n => n.id));
  }, []);

  const handleDeleteSelectedNodes = useCallback(() => {
      if (!graphElements) return;

      const selectedIdsSet = new Set(selectedNodeIds);

      const remainingNodes = graphElements.nodes.filter(n => !selectedIdsSet.has(n.id));
      const remainingEdges = graphElements.edges.filter(
          e => !selectedIdsSet.has(e.source) && !selectedIdsSet.has(e.target)
      );

      setGraphElements({ nodes: remainingNodes, edges: remainingEdges });
      setSelectedNodeIds([]);
  }, [selectedNodeIds, graphElements]);
    
  const handleCollapseSelectedNodes = useCallback(() => {
    if (!graphElements) return;
    setCollapsedNodeIds(prev => {
        const newSet = new Set(prev);
        selectedNodeIds.forEach(id => {
            const node = graphElements.nodes.find(n => n.id === id);
            if (node?.data.hasChildren) {
                newSet.add(id);
            }
        });
        return newSet;
    });
  }, [selectedNodeIds, graphElements]);

  const handleExpandSelectedNodes = useCallback(() => {
    setCollapsedNodeIds(prev => {
        const newSet = new Set(prev);
        selectedNodeIds.forEach(id => {
            newSet.delete(id);
        });
        return newSet;
    });
  }, [selectedNodeIds]);

  const handleGroupSelectedNodes = useCallback(() => {
    if (selectedNodeIds.length < 2 || !graphElements) return;
    const groupName = window.prompt(t('groupNamePrompt'));
    if (!groupName) return;

    const groupId = `group-${Date.now()}`;
    const selectedNodes = graphElements.nodes.filter(n => selectedNodeIds.includes(n.id));
    
    // Simple average position for the new group node
    const avgX = selectedNodes.reduce((sum, n) => sum + (n.position?.x || 0), 0) / selectedNodes.length;
    const avgY = selectedNodes.reduce((sum, n) => sum + (n.position?.y || 0), 0) / selectedNodes.length;
    
    const groupNode: Node<GraphNode> = {
      id: groupId,
      type: 'custom',
      data: {
        id: groupId,
        label: groupName,
        type: 'group',
      },
      position: { x: avgX, y: avgY },
      style: {
        width: NODE_WIDTH * 2,
        height: 200,
        backgroundColor: 'rgba(107, 114, 128, 0.1)',
        borderColor: 'rgb(107, 114, 128)',
        borderStyle: 'dashed',
      },
    };

    const updatedNodes = graphElements.nodes.map(n => {
      if (selectedNodeIds.includes(n.id)) {
        return { ...n, parentNode: groupId, extent: 'parent' as const };
      }
      return n;
    });

    setGraphElements(prev => ({
        ...prev!,
        nodes: [...updatedNodes, groupNode]
    }));
    setSelectedNodeIds([]);
  }, [selectedNodeIds, graphElements, t]);

  const handleUngroupNode = useCallback((groupId: string) => {
    if (!graphElements) return;

    const nodesToRelease = graphElements.nodes.filter(n => n.parentNode === groupId);
    const updatedNodes = graphElements.nodes
        .filter(n => n.id !== groupId) // Remove the group node
        .map(n => {
            if (n.parentNode === groupId) {
                // Release the node from the parent
                const { parentNode, ...rest } = n;
                return rest;
            }
            return n;
        });

    setGraphElements(prev => ({
        ...prev!,
        nodes: updatedNodes,
    }));
  }, [graphElements]);

  const handleNodeToggle = useCallback((nodeId: string) => {
    setCollapsedNodeIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(nodeId)) {
            newSet.delete(nodeId);
        } else {
            newSet.add(nodeId);
        }
        return newSet;
    });
  }, []);
    
  const handleNodeTrace = useCallback((nodeData: GraphNode) => {
    setActiveTrace(nodeData);
  }, []);

  const handlePromptSelect = (promptId: string) => {
    if (!promptId) {
        setPrompt('');
        return;
    }
    const selected = availablePrompts.find(p => p.id === promptId);
    if (selected) {
        setPrompt(selected.content);
    }
  };

  const renderHighlightedText = (fullText: string, linesStr: string | null) => {
      const linesToHighlight = parseLineNumbers(linesStr);
      if (linesToHighlight.length === 0) {
          return fullText;
      }
      const lines = fullText.split('\n');
      
      return (
          <>
              {lines.map((line, index) => {
                  const lineNumber = index + 1;
                  const isHighlighted = linesToHighlight.includes(lineNumber);
                  return (
                      <span key={index} className={isHighlighted ? 'bg-cyan-900/50 block' : 'block'}>
                          {line}
                      </span>
                  );
              })}
          </>
      );
  };

  const reactFlowInstance = useMemo(() => (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onSelectionChange={handleSelectionChange}
      nodeTypes={nodeTypes}
      fitView
      className="bg-gray-800"
      multiSelectionKeyCode="Shift"
      selectionOnDrag={true}
    >
      <Background color="#4A5568" gap={16} />
      <Controls />
      <MiniMap nodeStrokeWidth={3} zoomable pannable />
    </ReactFlow>
  ), [nodes, edges, onNodesChange, onEdgesChange, handleSelectionChange]);

  return (
    <div className="flex flex-col md:flex-row h-screen font-sans text-white bg-gray-900 relative overflow-hidden">
      <div className="w-full md:w-1/3 lg:w-1/4 p-4 flex flex-col bg-gray-900 border-r border-gray-700 shadow-lg">
        <header className="mb-4 flex-shrink-0">
          <h1 className="text-2xl font-bold text-cyan-400">{t('appTitle')}</h1>
          <p className="text-sm text-gray-400">{t('appDescription')}</p>
          <div className="mt-4">
              <label htmlFor="language-select" className="text-sm font-medium text-gray-300 mr-2">
                  {t('languageLabel')}:
              </label>
              <select
                  id="language-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'pt' | 'en')}
                  className="p-1 bg-gray-800 border border-gray-600 rounded-md text-gray-200 text-sm focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition duration-200"
              >
                  <option value="pt">Português (Brasil)</option>
                  <option value="en">English</option>
              </select>
          </div>
        </header>
        
        <div className="flex-grow min-h-0 overflow-y-auto pr-2 -mr-2">
            <div className="flex border-b border-gray-700 mb-4 sticky top-0 bg-gray-900">
                { (['generate', 'manual', 'history'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`capitalize text-sm font-medium py-2 px-4 border-b-2 transition-colors duration-200 ${activeTab === tab ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400 hover:text-white'}`}>
                        {t(`${tab}Tab`)}
                    </button>
                ))}
            </div>

            <div className="flex-grow flex flex-col min-h-0">
              {activeTab === 'generate' && (
                 <div className="flex flex-col gap-4 flex-grow">
                    <div>
                      <label htmlFor="model-select" className="text-sm font-medium text-gray-300 mb-2 block">
                        {t('modelLabel')}
                      </label>
                      <select
                        id="model-select"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-gray-200 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition duration-200"
                      >
                        {GEMINI_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="max-concepts-input" className="text-sm font-medium text-gray-300 mb-2 block">
                        {t('maxConceptsLabel')}
                      </label>
                      <input
                        id="max-concepts-input"
                        type="number"
                        value={maxConcepts}
                        onChange={(e) => setMaxConcepts(Math.max(1, parseInt(e.target.value, 10)) || 1)}
                        min="1"
                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-gray-200 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition duration-200"
                      />
                    </div>
                  
                    <div>
                        <label htmlFor="file-upload" className="text-sm font-medium text-gray-300 mb-2 block">
                            {t('uploadLabel')}
                        </label>
                        <input type="file" id="file-upload" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.txt,.md" className="hidden"/>
                        <button onClick={() => fileInputRef.current?.click()} className="w-full text-sm p-3 bg-gray-800 border border-dashed border-gray-600 rounded-md text-gray-400 hover:bg-gray-700 hover:border-cyan-500 transition duration-200">
                            {selectedFile ? t('selectedFile', { filename: selectedFile.name }) : t('selectFileButton')}
                        </button>
                    </div>

                    <div>
                        <label htmlFor="prompt-select" className="text-sm font-medium text-gray-300 mb-2 block">
                            {t('selectPromptLabel')}
                        </label>
                        <select
                            id="prompt-select"
                            onChange={(e) => handlePromptSelect(e.target.value)}
                            defaultValue=""
                            className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-gray-200 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition duration-200"
                        >
                            <option value="">{t('selectPromptPlaceholder')}</option>
                            {availablePrompts.map(p => (
                                <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col flex-grow">
                        <label htmlFor="prompt-input" className="text-sm font-medium text-gray-300 mb-2">
                            {t('promptLabel')}
                        </label>
                        <textarea id="prompt-input" value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full flex-grow p-3 bg-gray-800 border border-gray-600 rounded-md text-gray-200 text-xs font-mono focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition duration-200" placeholder={t('promptPlaceholder')} />
                    </div>
                    
                    {isLoading ? (
                      <button onClick={handleStopGenerating} className="mt-auto w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition duration-300">
                        {t('stopGeneratingButton')}
                      </button>
                    ) : (
                      <button onClick={handleFileGenerate} disabled={!selectedFile || prompt.trim() === ''} className="mt-auto w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed">
                        {t('generateWithAIButton')}
                      </button>
                    )}
                </div>
              )}

              {activeTab === 'manual' && (
                <div className="flex flex-col gap-4 flex-grow">
                    <div className="flex-grow flex flex-col">
                        <label htmlFor="json-input" className="text-sm font-medium text-gray-300 mb-2">
                            {t('pasteJsonLabel')}
                        </label>
                        <textarea id="json-input" value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} className="w-full flex-grow p-3 bg-gray-800 border border-gray-600 rounded-md text-gray-200 text-xs font-mono focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition duration-200" placeholder="Enter JSON data..." />
                    </div>
                    <button onClick={() => {
                      const finalJsonString = processJsonAndSetGraph(jsonInput);
                      if (finalJsonString) {
                          setJsonInput(finalJsonString);
                      }
                    }} disabled={isLoading} className="mt-auto w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed">
                        {t('generateGraphButton')}
                    </button>
                </div>
              )}
                
              {activeTab === 'history' && (
                 <div className="flex flex-col gap-2 flex-grow">
                    {history.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center mt-4">{t('historyEmpty')}</p>
                    ) : (
                        history.map(item => (
                            <div key={item.id} className="bg-gray-800 p-3 rounded-md border border-gray-700 text-xs">
                                <div className="font-bold text-gray-300 truncate">{item.filename}</div>
                                <p className="text-gray-400 mt-1 italic truncate">"{item.prompt}"</p>
                                <div className="text-gray-500 text-[10px] mt-2">{new Date(item.timestamp).toLocaleString()}</div>
                                <div className="flex gap-2 mt-2">
                                    <button onClick={() => handleSelectHistoryItem(item)} className="flex-1 bg-cyan-700 hover:bg-cyan-600 text-white text-xs py-1 px-2 rounded">{t('historyLoadButton')}</button>
                                    <button onClick={() => handleDeleteHistoryItem(item.id)} className="bg-red-800 hover:bg-red-700 text-white text-xs py-1 px-2 rounded">{t('historyDeleteButton')}</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
              )}
            </div>

            {error && <div className="mt-4 p-3 bg-red-800 border border-red-600 text-red-200 rounded-md text-sm whitespace-pre-wrap">{error}</div>}

            {isLoading && (
                <div className="mt-4 w-full text-white py-2 px-4 rounded-md flex items-center justify-center">
                     <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                     <span className="text-sm">{loadingMessage ? t(loadingMessage) : t('loadingDefault')}</span>
                </div>
            )}
            
            <div className="mt-6 pt-4 border-t border-gray-700">
                <h2 className="text-sm font-medium text-gray-300 mb-3">{t('layoutDirectionTitle')}</h2>
                <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(LAYOUTS) as Array<keyof typeof LAYOUTS>).map((dir) => (
                        <button
                            key={dir}
                            onClick={() => setLayout(dir)}
                            className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors duration-200 ${ layout === dir ? 'bg-cyan-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300' }`}
                        >
                            {t(LAYOUTS[dir])}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-700">
                <h2 className="text-sm font-medium text-gray-300 mb-3">{t('filtersTitle')}</h2>
                <div className="flex flex-col gap-4">
                    <input
                        type="text"
                        placeholder={t('filterByLabelPlaceholder')}
                        value={labelFilter}
                        onChange={e => setLabelFilter(e.target.value)}
                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-gray-200 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                    />
                    <input
                        type="text"
                        placeholder={t('filterByEdgeLabelPlaceholder')}
                        value={edgeLabelFilter}
                        onChange={e => setEdgeLabelFilter(e.target.value)}
                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-gray-200 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                    />
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        {availableTypes.map(type => (
                            <label key={type} className="flex items-center gap-2 text-gray-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={typeFilters.has(type)}
                                    onChange={() => handleTypeFilterChange(type)}
                                    className="form-checkbox h-4 w-4 bg-gray-700 border-gray-600 rounded text-cyan-500 focus:ring-cyan-600 transition-colors"
                                />
                                <span className="capitalize">{type}</span>
                            </label>
                        ))}
                    </div>
                     { (labelFilter.trim() !== '' || typeFilters.size > 0 || edgeLabelFilter.trim() !== '') && (
                        <button
                            onClick={handleClearFilters}
                            className="w-full py-2 px-3 text-xs font-semibold rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                        >
                            {t('clearFiltersButton')}
                        </button>
                     )}
                </div>
            </div>

            {selectedNodeIds.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-700">
                    <h2 className="text-sm font-medium text-gray-300 mb-3">
                        {t('bulkActionsTitle', { count: selectedNodeIds.length })}
                    </h2>
                    <div className="flex flex-col gap-2">
                         <button
                            onClick={handleCollapseSelectedNodes}
                            disabled={!canCollapseSelected}
                            className="w-full py-2 px-3 text-xs font-semibold rounded-md bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
                        >
                            {t('collapseSelectedButton')}
                        </button>
                        <button
                            onClick={handleExpandSelectedNodes}
                            disabled={!canExpandSelected}
                            className="w-full py-2 px-3 text-xs font-semibold rounded-md bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
                        >
                            {t('expandSelectedButton')}
                        </button>
                        <button
                            onClick={handleGroupSelectedNodes}
                            disabled={selectedNodeIds.length < 2}
                            className="w-full py-2 px-3 text-xs font-semibold rounded-md bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
                        >
                            {t('groupSelectedButton')}
                        </button>
                        <button
                            onClick={handleDeleteSelectedNodes}
                            className="w-full py-2 px-3 text-xs font-semibold rounded-md bg-red-800 hover:bg-red-700 text-white transition-colors mt-2"
                        >
                            {t('deleteSelectedButton')}
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
      <main className="w-full md:w-2/3 lg:w-3/4 flex-grow min-h-0">
        {reactFlowInstance}
      </main>
       <div 
         ref={drawerRef}
         className={`absolute top-0 right-0 h-screen bg-gray-800 border-l border-gray-700 shadow-2xl z-20 transform transition-transform duration-300 ease-in-out ${activeTrace ? 'translate-x-0' : 'translate-x-full'} p-4 flex flex-col`}
         style={{ width: `${drawerWidth}px`}}
       >
        <div 
          onMouseDown={handleMouseDown}
          className="absolute top-0 left-0 h-full w-2 cursor-col-resize z-30"
          title="Resize Panel"
        />
        {activeTrace && (
            <>
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-lg font-bold text-cyan-400">{t('traceabilityDrawerTitle')}</h2>
                    <button onClick={() => setActiveTrace(null)} className="text-gray-400 hover:text-white" aria-label="Close">
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                
                <div className="flex-shrink-0 mb-4">
                    <div className="text-sm font-semibold text-gray-300 mb-2 truncate" title={activeTrace.label}>
                        {activeTrace.label}
                    </div>
                    {activeTrace.source_lines && (
                        <div className="text-xs text-gray-400 mb-2 font-mono">
                            <span className="font-semibold">{t('traceabilityDrawerLinesLabel')}</span> {activeTrace.source_lines}
                        </div>
                    )}
                    <div className="bg-gray-900 p-3 rounded-md text-gray-300 text-sm italic border border-gray-700 max-h-40 overflow-y-auto">
                        "{activeTrace.source_quote || t('traceabilityDrawerEmpty')}"
                    </div>
                </div>

                <div className="flex-grow min-h-0">
                    {pdfFile && activeTrace.source_quote ? (
                      <PdfViewer file={pdfFile} highlightText={activeTrace.source_quote} />
                    ) : preprocessedText ? (
                        <div className="overflow-y-auto h-full bg-gray-900 p-2 rounded-md">
                            <pre className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap font-mono">
                                {renderHighlightedText(preprocessedText, activeTrace.source_lines || null)}
                            </pre>
                        </div>
                    ) : (
                        <div className="overflow-y-auto h-full bg-gray-900 p-3 rounded-md flex items-center justify-center">
                           <p className="text-gray-500 text-sm italic text-center">{t('traceabilityDrawerFullContextUnavailable')}</p>
                        </div>
                    )}
                </div>
            </>
        )}
    </div>
    </div>
  );
}

export default App;