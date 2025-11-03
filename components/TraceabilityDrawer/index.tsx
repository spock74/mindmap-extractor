import React, { useState, useCallback, useRef } from 'react';
import { useI18n } from '../../i18n';
import { GraphNode } from '../../types';
import { parseLineNumbers } from '../../utils/text';
import { PdfViewer } from '../PdfViewer';
import { TraceInfoPanel } from './TraceInfoPanel';
import { ChevronLeftIcon, ChevronRightIcon } from '../common/Icons';

const PDF_DRAWER_WIDTH = '60vw';

interface TraceabilityDrawerProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    activeTrace: GraphNode | null;
    setActiveTrace: (trace: GraphNode | null) => void;
    pdfFile: File | null;
    preprocessedText: string | null;
}

export const TraceabilityDrawer: React.FC<TraceabilityDrawerProps> = ({
    isOpen,
    setIsOpen,
    activeTrace,
    setActiveTrace,
    pdfFile,
    preprocessedText,
}) => {
    const { t } = useI18n();
    const [isTraceInfoPanelOpen, setIsTraceInfoPanelOpen] = useState(true);
    const pdfDrawerRef = useRef<HTMLDivElement>(null);
    const dragInfo = useRef({ isDragging: false, startX: 0, startTranslateX: 0 });

    const handlePdfDrawerDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        dragInfo.current = {
            isDragging: true,
            startX: e.clientX,
            startTranslateX: 0,
        };
        if (pdfDrawerRef.current) {
            pdfDrawerRef.current.style.transition = 'none';
        }
        window.addEventListener('mousemove', handlePdfDrawerDragMove);
        window.addEventListener('mouseup', handlePdfDrawerDragEnd);
    }, []);

    const handlePdfDrawerDragMove = useCallback((e: MouseEvent) => {
        if (!dragInfo.current.isDragging || !pdfDrawerRef.current) return;
        const deltaX = e.clientX - dragInfo.current.startX;
        const newTranslateX = Math.max(0, dragInfo.current.startTranslateX + deltaX);
        pdfDrawerRef.current.style.transform = `translateX(${newTranslateX}px)`;
    }, []);

    const handlePdfDrawerDragEnd = useCallback(() => {
        if (!dragInfo.current.isDragging || !pdfDrawerRef.current) return;
        dragInfo.current.isDragging = false;
        window.removeEventListener('mousemove', handlePdfDrawerDragMove);
        window.removeEventListener('mouseup', handlePdfDrawerDragEnd);

        const drawerWidth = pdfDrawerRef.current.offsetWidth;
        const currentTranslateX = new DOMMatrix(getComputedStyle(pdfDrawerRef.current).transform).m41;
        pdfDrawerRef.current.style.transition = 'transform 0.3s ease-in-out';

        if (currentTranslateX > drawerWidth / 3) {
            setIsOpen(false);
        } else {
            pdfDrawerRef.current.style.transform = `translateX(0px)`;
        }
    }, [setIsOpen]);
    
    const renderHighlightedText = (fullText: string, linesStr: string | null) => {
        const linesToHighlight = parseLineNumbers(linesStr);
        if (linesToHighlight.length === 0) return fullText;
        
        return fullText.split('\n').map((line, index) => {
            const lineNumber = index + 1;
            const isHighlighted = linesToHighlight.includes(lineNumber);
            return (
                <span key={index} className={isHighlighted ? 'bg-cyan-900/50 block' : 'block'}>
                    {line}
                </span>
            );
        });
    };

    const showPdfViewer = !!pdfFile;
    const showTracePanel = !!activeTrace;
    const showPreprocessedText = showTracePanel && !showPdfViewer && !!preprocessedText;
    const showContextUnavailable = showTracePanel && !showPdfViewer && !preprocessedText;
    const showDrawerContent = showPdfViewer || showTracePanel;

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="absolute top-1/2 -translate-y-1/2 bg-gray-700 hover:bg-gray-600 text-white rounded-l-full w-8 h-16 flex items-center justify-center z-30 transition-all duration-300 ease-in-out"
                style={{ right: isOpen ? `calc(${PDF_DRAWER_WIDTH} - 1px)` : '0', transform: isOpen ? 'translateX(0)' : 'translateX(50%)' }}
                title={t(isOpen ? 'closePdfDrawerTooltip' : 'openPdfDrawerTooltip')}
                aria-label={t(isOpen ? 'closePdfDrawerTooltip' : 'openPdfDrawerTooltip')}
            >
                {isOpen ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </button>

            <div
                ref={pdfDrawerRef}
                className={`absolute top-0 right-0 h-screen bg-gray-800 border-l border-gray-700 shadow-2xl z-20 transform transition-transform duration-300 ease-in-out flex flex-col`}
                style={{ width: PDF_DRAWER_WIDTH, transform: isOpen ? 'translateX(0%)' : 'translateX(100%)' }}
                onMouseDown={isOpen ? handlePdfDrawerDragStart : undefined}
            >
                {showDrawerContent ? (
                    <div className="relative h-full w-full overflow-hidden">
                        {showTracePanel && (
                            <TraceInfoPanel
                                activeTrace={activeTrace}
                                setActiveTrace={setActiveTrace}
                                isTraceInfoPanelOpen={isTraceInfoPanelOpen}
                                setIsTraceInfoPanelOpen={setIsTraceInfoPanelOpen}
                            />
                        )}

                        <div className="h-full pt-4">
                            {showPdfViewer ? (
                                <PdfViewer file={pdfFile} highlightText={activeTrace?.source_quote || ''} />
                            ) : showPreprocessedText ? (
                                <div className="overflow-y-auto h-full bg-gray-900 p-2 rounded-md">
                                    <pre className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap font-mono">
                                        {renderHighlightedText(preprocessedText!, activeTrace!.source_lines || null)}
                                    </pre>
                                </div>
                            ) : showContextUnavailable ? (
                                <div className="overflow-y-auto h-full bg-gray-900 p-3 rounded-md flex items-center justify-center">
                                    <p className="text-gray-500 text-sm italic text-center">{t('traceabilityDrawerFullContextUnavailable')}</p>
                                </div>
                            ) : null}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500 italic px-4 text-center">{t('traceabilityDrawerPlaceholder')}</p>
                    </div>
                )}
            </div>
        </>
    );
};
