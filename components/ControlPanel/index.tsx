import React, { useState } from 'react';
import { useI18n } from '../../i18n';
import { HistoryItem } from '../../types';
import { Header } from './Header';
import { GenerateTab } from './GenerateTab';
import { ManualTab } from './ManualTab';
import { HistoryTab } from './HistoryTab';
import { LayoutControls } from './LayoutControls';
import { FilterControls } from './FilterControls';
import { BulkActions } from './BulkActions';
import { ScaffoldedControlPanel } from './ScaffoldedControlPanel';

interface ControlPanelProps {
    isOpen: boolean;
    onClose: () => void;
    language: string;
    toggleLanguage: () => void;
    jsonInput: string;
    setJsonInput: (value: string) => void;
    aiJsonOutput: string;
    history: HistoryItem[];
    handleSelectHistoryItem: (item: HistoryItem) => void;
    handleDeleteHistoryItem: (id: string) => void;
    error: string | null;
    isLoading: boolean;
    loadingMessage: string;
    layout: string;
    setLayout: (layout: string) => void;
    handleGenerateGraphFromJson: () => void;
    handleFileGenerate: (
        selectedFile: File,
        prompt: string,
        model: string,
        maxConcepts: number,
        useFlexibleSchema: boolean
    ) => Promise<void>;
    handleStopGenerating: () => void;
    pdfFile: File | null;
    setPdfFile: (file: File | null) => void;
    setIsPdfDrawerOpen: (isOpen: boolean) => void;
    labelFilter: string;
    setLabelFilter: (value: string) => void;
    edgeLabelFilter: string;
    setEdgeLabelFilter: (value: string) => void;
    typeFilters: Set<string>;
    availableTypes: string[];
    handleTypeFilterChange: (type: string) => void;
    handleClearFilters: () => void;
    selectedNodeIdsForActions: string[];
    canCollapseSelected: boolean;
    canExpandSelected: boolean;
    handleCollapseSelectedNodes: () => void;
    handleExpandSelectedNodes: () => void;
    handleGroupSelectedNodes: () => void;
    handleDeleteSelectedNodes: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = (props) => {
    const { t } = useI18n();
    const [mainTab, setMainTab] = useState<'graph' | 'causal' | 'testes'>('graph');
    const [activeTab, setActiveTab] = useState<'generate' | 'manual' | 'history'>('generate');

    return (
        <div className={`absolute top-0 left-0 h-full w-full md:w-1/3 lg:w-1/4 p-4 flex flex-col bg-gray-900 border-r border-gray-700 shadow-lg z-20 transform transition-transform duration-300 ease-in-out ${props.isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <Header
                language={props.language}
                toggleLanguage={props.toggleLanguage}
                onClose={props.onClose}
            />

            <div className="flex border-b border-gray-700 mb-4 flex-shrink-0">
                {(['graph', 'causal', 'testes'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setMainTab(tab)}
                        className={`capitalize text-sm font-medium py-2 px-4 border-b-2 transition-colors duration-200 ${mainTab === tab ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400 hover:text-white'}`}
                    >
                        {t(`${tab}Tab`)}
                    </button>
                ))}
            </div>

            <div className="flex-grow min-h-0 overflow-y-auto pr-2 -mr-2">
                {mainTab === 'graph' && (
                    <>
                        <div className="flex border-b border-gray-700 mb-4 sticky top-0 bg-gray-900">
                            {(['generate', 'manual', 'history'] as const).map(tab => (
                                <button key={tab} onClick={() => setActiveTab(tab)} className={`capitalize text-sm font-medium py-2 px-4 border-b-2 transition-colors duration-200 ${activeTab === tab ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400 hover:text-white'}`}>
                                    {t(`${tab}Tab`)}
                                </button>
                            ))}
                        </div>

                        <div className="flex-grow flex flex-col min-h-0">
                            {activeTab === 'generate' && <GenerateTab {...props} />}
                            {activeTab === 'manual' && <ManualTab {...props} />}
                            {activeTab === 'history' && <HistoryTab {...props} setActiveTab={setActiveTab} />}
                        </div>
                        
                        {props.error && <div className="mt-4 p-3 bg-red-800 border border-red-600 text-red-200 rounded-md text-sm whitespace-pre-wrap">{props.error}</div>}
                        
                        {props.isLoading && (
                            <div className="mt-4 w-full text-white py-2 px-4 rounded-md flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span className="text-sm">{props.loadingMessage ? t(props.loadingMessage) : t('loadingDefault')}</span>
                            </div>
                        )}

                        <LayoutControls {...props} />
                        <FilterControls {...props} />
                        <BulkActions {...props} />
                    </>
                )}
                {mainTab === 'causal' && <ScaffoldedControlPanel tabName="Causal" />}
                {mainTab === 'testes' && <ScaffoldedControlPanel tabName="Testes" />}
            </div>
        </div>
    );
}
