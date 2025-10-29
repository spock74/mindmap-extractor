

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
import zod from 'zod';

import { getLayoutedElements } from './utils/layout';
import { JsonDataSchema } from './utils/schema';
import { JsonData, Triplet, HistoryItem } from './types';
import { DEFAULT_JSON_DATA, DEFAULT_GEMINI_PROMPT, GEMINI_MODELS, NODE_TYPE_COLORS } from './constants';
import { CustomNode } from './components/CustomNode';

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

// --- React Flow Configuration ---

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


// --- Main App Component ---

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [layout, setLayout] = useState<string>('TB');

  // State for inputs and data
  const [jsonInput, setJsonInput] = useState<string>(DEFAULT_JSON_DATA);
  const [graphElements, setGraphElements] = useState<{ nodes: Node[], edges: Edge[] } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'generate' | 'manual' | 'history'>('generate');

  // State for UI feedback
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');

  // State for Generation tab
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState<string>(DEFAULT_GEMINI_PROMPT);
  const [model, setModel] = useState<string>(GEMINI_MODELS[1]); // Default to flash
  const generationCancelledRef = useRef<boolean>(false);

  // --- Gemini API Call ---
  const generateJsonFromText = useCallback(async (content: string, userPrompt: string, selectedModel: string): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API key is missing. Please ensure it is set in your environment variables.");
    }
    
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const finalPrompt = `
You are an expert at analyzing documents and extracting structured information.
Your task is to read the following document and generate a knowledge graph based on the user's request.
The output MUST be a valid JSON object following the schema provided.

**JSON Output Schema:**
- The root of the object must be a single key called "triplets".
- "triplets" must be an array of objects.
- Each object in the array represents a relationship (a triplet).
- Each triplet must have three keys: "s" (subject), "p" (predicate), and "o" (object).
- "s" and "o" must be objects with two keys:
    - "label": (string) The name of the entity.
    - "type": (string) The category of the entity. Choose from: ${Object.keys(NODE_TYPE_COLORS).join(', ')}.
- "p" must be a non-empty string describing the relationship.
- "o" can be null if there is no object for a given subject and predicate.

**User's Request:**
${userPrompt}

**Document Content:**
---
${content}
---

Now, generate the JSON object. Do not include any other text, markdown formatting, or explanations. Only output the raw JSON.`;

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
    if (graphElements) {
      setLoadingMessage('Calculating layout...');
      const direction = layout.startsWith('LR') ? 'LR' : layout.startsWith('RL') ? 'RL' : layout.startsWith('BT') ? 'BT' : 'TB';
      
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
      setLoadingMessage('');
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [graphElements, layout, setNodes, setEdges]);


  // --- Data Processing Callbacks ---

  const processJsonAndSetGraph = useCallback((jsonString: string) => {
    setError(null);
    setGraphElements(null);
    try {
      const parsedJson = JSON.parse(jsonString);
      const data: JsonData = JsonDataSchema.parse(parsedJson);
      
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
      
      const initialNodes = Array.from(nodeMap.values());
      setGraphElements({ nodes: initialNodes, edges: initialEdges });
      return true;
    } catch (e) {
      let errorMessage = 'An unknown error occurred.';
      if (e instanceof zod.ZodError) {
        const formattedErrors = e.issues.map(err => `At '${err.path.join('.')}': ${err.message}`).join('\n');
        errorMessage = `JSON validation failed:\n${formattedErrors}`;
      } else if (e instanceof SyntaxError) {
        errorMessage = `Invalid JSON: ${e.message}`;
      } else if (e instanceof Error) {
        errorMessage = e.message;
      }
      setError(errorMessage);
      setIsLoading(false);
      setLoadingMessage('');
      return false;
    }
  }, []);
  

  // --- Event Handlers ---

  const handleFileGenerate = async () => {
    if (!selectedFile) return;
    
    setIsLoading(true);
    setError(null);
    generationCancelledRef.current = false;

    try {
      setLoadingMessage("Reading file content...");
      const fileContent = await readFileContent(selectedFile);
      
      if (generationCancelledRef.current) return;
      
      setLoadingMessage("Generating graph with Gemini AI...");
      const jsonString = await generateJsonFromText(fileContent, prompt, model);
      
      if (generationCancelledRef.current) return;
      
      setLoadingMessage("Processing graph data...");
      const success = processJsonAndSetGraph(jsonString);

      if (success) {
        const newHistoryItem: HistoryItem = {
          id: `hist-${Date.now()}`,
          filename: selectedFile.name,
          prompt: prompt,
          jsonString: jsonString,
          timestamp: new Date().toISOString(),
        };
        setHistory(prev => [newHistoryItem, ...prev]);
      }
    } catch (e) {
      if (generationCancelledRef.current) {
        setError("Generation cancelled by user.");
      } else {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        setError(`Generation failed: ${errorMessage}`);
      }
      setIsLoading(false);
      setLoadingMessage('');
    }
  };
  
  const handleStopGenerating = () => {
    generationCancelledRef.current = true;
    setIsLoading(false);
    setLoadingMessage('');
    setError("Generation cancelled by user.");
  };

  const handleSelectHistoryItem = useCallback((item: HistoryItem) => {
    setJsonInput(item.jsonString);
    processJsonAndSetGraph(item.jsonString);
    setActiveTab('manual');
  }, [processJsonAndSetGraph]);

  const handleDeleteHistoryItem = useCallback((id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
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
      <div className="w-full md:w-1/3 lg:w-1/4 p-4 flex flex-col bg-gray-900 border-r border-gray-700 shadow-lg overflow-y-auto">
        <header className="mb-4">
          <h1 className="text-2xl font-bold text-cyan-400">JSON to Mind Map</h1>
          <p className="text-sm text-gray-400">Visualize knowledge graphs from JSON or text documents using Gemini.</p>
        </header>
        
        <div className="flex border-b border-gray-700 mb-4">
            { (['generate', 'manual', 'history'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`capitalize text-sm font-medium py-2 px-4 border-b-2 transition-colors duration-200 ${activeTab === tab ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400 hover:text-white'}`}>
                    {tab}
                </button>
            ))}
        </div>

        <div className="flex-grow flex flex-col min-h-0">
          {activeTab === 'generate' && (
             <div className="flex flex-col gap-4 flex-grow">
                <div>
                  <label htmlFor="model-select" className="text-sm font-medium text-gray-300 mb-2 block">
                    Model
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
                    <label htmlFor="file-upload" className="text-sm font-medium text-gray-300 mb-2 block">
                        Upload Document (.pdf, .txt, .md)
                    </label>
                    <input type="file" id="file-upload" ref={fileInputRef} onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} accept=".pdf,.txt,.md" className="hidden"/>
                    <button onClick={() => fileInputRef.current?.click()} className="w-full text-sm p-3 bg-gray-800 border border-dashed border-gray-600 rounded-md text-gray-400 hover:bg-gray-700 hover:border-cyan-500 transition duration-200">
                        {selectedFile ? `Selected: ${selectedFile.name}` : 'Click to select a file'}
                    </button>
                </div>
                <div className="flex flex-col flex-grow">
                    <label htmlFor="prompt-input" className="text-sm font-medium text-gray-300 mb-2">
                        Prompt
                    </label>
                    <textarea id="prompt-input" value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full flex-grow p-3 bg-gray-800 border border-gray-600 rounded-md text-gray-200 text-xs font-mono focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition duration-200" placeholder="Enter your prompt here..." />
                </div>
                
                {isLoading ? (
                  <button onClick={handleStopGenerating} className="mt-auto w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition duration-300">
                    Stop Generating
                  </button>
                ) : (
                  <button onClick={handleFileGenerate} disabled={!selectedFile} className="mt-auto w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed">
                    Generate with AI
                  </button>
                )}
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="flex flex-col gap-4 flex-grow">
                <div className="flex-grow flex flex-col">
                    <label htmlFor="json-input" className="text-sm font-medium text-gray-300 mb-2">
                        Paste your JSON here:
                    </label>
                    <textarea id="json-input" value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} className="w-full flex-grow p-3 bg-gray-800 border border-gray-600 rounded-md text-gray-200 text-xs font-mono focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition duration-200" placeholder="Enter JSON data..." />
                </div>
                <button onClick={() => processJsonAndSetGraph(jsonInput)} disabled={isLoading} className="mt-auto w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed">
                    Generate Graph
                </button>
            </div>
          )}
            
          {activeTab === 'history' && (
             <div className="flex flex-col gap-2 flex-grow overflow-y-auto">
                {history.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center mt-4">No history yet. Generate a graph from a document to see it here.</p>
                ) : (
                    history.map(item => (
                        <div key={item.id} className="bg-gray-800 p-3 rounded-md border border-gray-700 text-xs">
                            <div className="font-bold text-gray-300 truncate">{item.filename}</div>
                            <p className="text-gray-400 mt-1 italic truncate">"{item.prompt}"</p>
                            <div className="text-gray-500 text-[10px] mt-2">{new Date(item.timestamp).toLocaleString()}</div>
                            <div className="flex gap-2 mt-2">
                                <button onClick={() => handleSelectHistoryItem(item)} className="flex-1 bg-cyan-700 hover:bg-cyan-600 text-white text-xs py-1 px-2 rounded">Load</button>
                                <button onClick={() => handleDeleteHistoryItem(item.id)} className="bg-red-800 hover:bg-red-700 text-white text-xs py-1 px-2 rounded">Delete</button>
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
                 <span className="text-sm">{loadingMessage || 'Loading...'}</span>
            </div>
        )}
        
        <div className="mt-6 pt-4 border-t border-gray-700">
            <h2 className="text-sm font-medium text-gray-300 mb-3">Layout Direction</h2>
            <div className="grid grid-cols-2 gap-2">
                {(Object.keys(LAYOUTS) as Array<keyof typeof LAYOUTS>).map((dir) => (
                    <button
                        key={dir}
                        onClick={() => setLayout(dir)}
                        className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors duration-200 ${ layout === dir ? 'bg-cyan-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300' }`}
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