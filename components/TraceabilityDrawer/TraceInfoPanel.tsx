import React from 'react';
import { useI18n } from '../../i18n';
import { GraphNode } from '../../types';
import { ChevronDownIcon } from '../common/Icons';

interface TraceInfoPanelProps {
    activeTrace: GraphNode;
    setActiveTrace: (trace: GraphNode | null) => void;
    isTraceInfoPanelOpen: boolean;
    setIsTraceInfoPanelOpen: (isOpen: boolean) => void;
}

export const TraceInfoPanel: React.FC<TraceInfoPanelProps> = ({ activeTrace, setActiveTrace, isTraceInfoPanelOpen, setIsTraceInfoPanelOpen }) => {
    const { t } = useI18n();

    return (
        <>
            <button
                onClick={() => setIsTraceInfoPanelOpen(!isTraceInfoPanelOpen)}
                title={t(isTraceInfoPanelOpen ? 'collapseTracePanelTooltip' : 'expandTracePanelTooltip')}
                aria-label={t(isTraceInfoPanelOpen ? 'collapseTracePanelTooltip' : 'expandTracePanelTooltip')}
                className="absolute top-0 left-1/2 w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center z-40 transition-all duration-300 transform hover:scale-110"
                style={{ transform: `translateX(-50%) translateY(-33%)` }}
            >
                <ChevronDownIcon isOpen={isTraceInfoPanelOpen} />
            </button>

            <div className={`absolute top-0 left-0 right-0 p-4 bg-gray-800 border-b border-gray-700 shadow-lg z-30 transform transition-transform duration-500 ease-in-out ${isTraceInfoPanelOpen ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-lg font-bold text-cyan-400">{t('traceabilityDrawerTitle')}</h2>
                    <button onClick={() => { setActiveTrace(null); setIsTraceInfoPanelOpen(false); }} className="text-gray-400 hover:text-white" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div className="flex-shrink-0">
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
            </div>
        </>
    );
};