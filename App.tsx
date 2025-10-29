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
} from 'reactflow';
import * as pdfjsLib from 'pdfjs-dist';
// Fix: Use named import for ZodError.
import { ZodError } from 'zod';

import { getLayoutedElements } from './utils/layout';
import { TripletJsonDataSchema, KnowledgeBaseJsonDataSchema } from './utils/schema';
import { TripletJsonData, KnowledgeBaseJsonData, Triplet, HistoryItem, KnowledgeBaseConcept } from './types';
import { DEFAULT_JSON_DATA, GEMINI_MODELS, NODE_TYPE_COLORS, LAYOUTS } from './constants';
import { CustomNode } from './components/CustomNode';
import { useI18n } from './i18n';
import { breakCycles } from './utils/graph';

// --- PDF Worker Setup ---
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.min.mjs';


// --- Helper Functions ---

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
                    };
                    triplets.push(newTriplet);
                }
            }
        }
    }
    return { triplets };
};


// --- React Flow Configuration ---

const nodeTypes = {
  custom: CustomNode,
};

// --- Main App Component ---

function App() {
  const { t, language, setLanguage } = useI18n();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [layout, setLayout] = useState<string>('LR_CURVED');

  // State for inputs and data
  const [jsonInput, setJsonInput] = useState<string>(DEFAULT_JSON_DATA);
  const [graphElements, setGraphElements] = useState<{ nodes: Node[], edges: Edge[] } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'generate' | 'manual' | 'history'>('generate');

  // State for UI feedback
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  
  // State for Filtering
  const [labelFilter, setLabelFilter] = useState<string>('');
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set());
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


  // State for Generation tab
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState<string>(t('defaultGeminiPrompt'));
  const [model, setModel] = useState<string>(GEMINI_MODELS[1]); // Default to flash
  const [maxConcepts, setMaxConcepts] = useState<number>(10);
  const generationCancelledRef = useRef<boolean>(false);
  
  // Update prompt when language changes
  useEffect(() => {
    setPrompt(t('defaultGeminiPrompt'));
  }, [language, t]);

  // --- Gemini API Call ---
  const generateJsonFromText = useCallback(async (content: string, userPrompt: string, selectedModel: string): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API key is missing. Please ensure it is set in your environment variables.");
    }
    
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // The prompt is now more generic as the user can provide complex instructions
    const finalPrompt = `
Based on the user's request, analyze the following document and generate a valid JSON object.
The structure of the JSON will be dictated by the user's request.
Ensure the output is only the raw JSON, without any surrounding text, explanations, or markdown formatting.

**User's Request:**
${userPrompt}

**Document Content:**
---
${content}
---

Now, generate the JSON object.`;

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

  // --- Effects ---

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
  

  useEffect(() => {
    if (!graphElements) {
      setNodes([]);
      setEdges([]);
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage('loadingMessageApplyingFilters');

    // 1. Filtering
    const hasActiveFilters = labelFilter.trim() !== '' || typeFilters.size > 0;

    const filteredNodesSource = hasActiveFilters
      ? graphElements.nodes.filter(node => {
          const labelMatch = labelFilter.trim() === '' || node.data.label.toLowerCase().includes(labelFilter.trim().toLowerCase());
          const typeMatch = typeFilters.size === 0 || typeFilters.has(node.data.type);
          return labelMatch && typeMatch;
        })
      : graphElements.nodes;

    const visibleNodeIds = new Set(filteredNodesSource.map(n => n.id));

    const filteredEdgesSource = hasActiveFilters
      ? graphElements.edges.filter(edge => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
      : graphElements.edges;

    if (filteredNodesSource.length === 0 && hasActiveFilters) {
        setNodes([]);
        setEdges([]);
        setIsLoading(false);
        setLoadingMessage('');
        return;
    }

    // 2. Layouting (using the filtered elements)
    const direction = layout.startsWith('LR') ? 'LR' : layout.startsWith('RL') ? 'RL' : layout.startsWith('BT') ? 'BT' : 'TB';
      
    const copiedNodes = JSON.parse(JSON.stringify(filteredNodesSource));
    const copiedEdges = JSON.parse(JSON.stringify(filteredEdgesSource));
      
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
    setLoadingMessage('');

  }, [graphElements, layout, labelFilter, typeFilters, setNodes, setEdges]);


  // --- Data Processing Callbacks ---
    
  const processTriplets = (data: TripletJsonData): { nodes: Node[], edges: Edge[] } => {
    const triplets = data.triplets;
    const nodeMap = new Map<string, Node>();
    const initialEdges: Edge[] = [];

    triplets.forEach((triplet: Triplet, index: number) => {
        if (triplet.s?.label && !nodeMap.has(triplet.s.label)) {
            nodeMap.set(triplet.s.label, {
                id: triplet.s.label,
                type: 'custom',
                data: { label: triplet.s.label, type: triplet.s.type || 'default' },
                position: { x: 0, y: 0 },
            });
        }
        if (triplet.o?.label && !nodeMap.has(triplet.o.label)) {
            nodeMap.set(triplet.o.label, {
                id: triplet.o.label,
                type: 'custom',
                data: { label: triplet.o.label, type: triplet.o.type || 'default' },
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
    
    const nodes = Array.from(nodeMap.values());
    const edges = breakCycles(nodes, initialEdges);

    return { nodes, edges };
  };
    
  const processJsonAndSetGraph = useCallback((jsonString: string): string | null => {
    setError(null);
    setGraphElements(null);
    try {
      const parsedJson = JSON.parse(jsonString);
      let dataToProcess: TripletJsonData;
      
      if ('kb' in parsedJson) {
          const kbData: KnowledgeBaseJsonData = KnowledgeBaseJsonDataSchema.parse(parsedJson);
          dataToProcess = transformKbToTriplets(kbData);
      } else if ('triplets' in parsedJson) {
          dataToProcess = TripletJsonDataSchema.parse(parsedJson);
      } else {
        throw new Error("Invalid JSON structure. The root key must be either 'triplets' or 'kb'.");
      }
      
      const { nodes, edges } = processTriplets(dataToProcess);
      setGraphElements({ nodes, edges });
      
      // Reset filters when new data is loaded
      setLabelFilter('');
      setTypeFilters(new Set());
      return JSON.stringify(dataToProcess, null, 2);
    } catch (e) {
      let errorMessage = 'An unknown error occurred.';
      // Fix: Use ZodError directly as it's now a named import.
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
  

  // --- Event Handlers ---

  const handleFileGenerate = async () => {
    if (!selectedFile) return;
    
    setIsLoading(true);
    setError(null);
    generationCancelledRef.current = false;

    try {
      setLoadingMessage("loadingMessageReadingFile");
      const fileContent = await readFileContent(selectedFile);
      
      if (generationCancelledRef.current) return;
      
      setLoadingMessage("loadingMessageGenerating");
      const formattedPrompt = prompt.replace('{MAX_CONCEITOS}', String(maxConcepts));
      const jsonString = await generateJsonFromText(fileContent, formattedPrompt, model);
      
      if (generationCancelledRef.current) return;
      
      setLoadingMessage("loadingMessageProcessing");
      const finalJsonString = processJsonAndSetGraph(jsonString);

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
      setTypeFilters(new Set());
  }, []);

  const reactFlowInstance = useMemo(() => (
    <ReactFlow
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
    </ReactFlow>
  ), [nodes, edges, onNodesChange, onEdgesChange]);

  // --- Render ---

  return (
    <div className="flex flex-col md:flex-row h-screen font-sans text-white bg-gray-900">
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
                        <input type="file" id="file-upload" ref={fileInputRef} onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} accept=".pdf,.txt,.md" className="hidden"/>
                        <button onClick={() => fileInputRef.current?.click()} className="w-full text-sm p-3 bg-gray-800 border border-dashed border-gray-600 rounded-md text-gray-400 hover:bg-gray-700 hover:border-cyan-500 transition duration-200">
                            {selectedFile ? t('selectedFile', { filename: selectedFile.name }) : t('selectFileButton')}
                        </button>
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
                      <button onClick={handleFileGenerate} disabled={!selectedFile} className="mt-auto w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed">
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
                     { (labelFilter || typeFilters.size > 0) && (
                        <button
                            onClick={handleClearFilters}
                            className="w-full py-2 px-3 text-xs font-semibold rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                        >
                            {t('clearFiltersButton')}
                        </button>
                     )}
                </div>
            </div>
        </div>
      </div>
      <main className="w-full md:w-2/3 lg:w-3/4 flex-grow min-h-0">
        {reactFlowInstance}
      </main>
    </div>
  );
}

export default App;
