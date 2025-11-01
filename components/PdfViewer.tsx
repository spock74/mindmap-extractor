import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { useI18n } from '../i18n';

interface PdfViewerProps {
  file: File;
  highlightText: string;
}

interface TextItemWithCoords {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ file, highlightText }) => {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement | null>>(new Map());
  const highlightLayerRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // This ref will track if the scroll has already happened to prevent re-scrolling on re-renders
  const hasScrolledToHighlight = useRef(false);

  const renderPage = useCallback(async (pageNum: number, doc: pdfjsLib.PDFDocumentProxy) => {
    const canvas = canvasRefs.current.get(pageNum);
    const highlightLayer = highlightLayerRefs.current.get(pageNum);
    
    if (!canvas || !highlightLayer) return;

    try {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const context = canvas.getContext('2d');
      if (!context) return;
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Fix: Add the `canvas` property to `renderContext` to satisfy the `RenderParameters` type.
      // This version of pdfjs-dist requires the canvas element itself to be passed.
      const renderContext = {
        canvas,
        canvasContext: context,
        viewport: viewport,
      };
      await page.render(renderContext).promise;
      
      const textContent = await page.getTextContent();
      const textItems = textContent.items as TextItemWithCoords[];
      
      const cleanQuery = highlightText.replace(/\s+/g, '').toLowerCase();
      if (!cleanQuery) return;

      let pageContainsHighlight = false;
      const highlightedItemIndices = new Set<number>();

      for (let i = 0; i < textItems.length; i++) {
        if (!textItems[i].str.trim()) continue;

        let candidateText = '';
        for (let j = i; j < textItems.length; j++) {
            candidateText += textItems[j].str;
            const cleanCandidate = candidateText.replace(/\s+/g, '').toLowerCase();
            
            if (cleanCandidate === cleanQuery) {
                for (let k = i; k <= j; k++) {
                    highlightedItemIndices.add(k);
                }
                pageContainsHighlight = true;
                break; 
            }

            if (!cleanQuery.startsWith(cleanCandidate)) {
                break;
            }
        }
      }

      if (pageContainsHighlight) {
          highlightedItemIndices.forEach(index => {
              const item = textItems[index];
              if (!item) return;
              const defaultViewport = page.getViewport({ scale: 1 });
              const [, , , , charX, charY] = item.transform;
              const highlightDiv = document.createElement('div');
              highlightDiv.style.position = 'absolute';
              highlightDiv.style.backgroundColor = 'rgba(255, 255, 0, 0.4)';
              highlightDiv.style.left = `${(charX / defaultViewport.width) * 100}%`;
              highlightDiv.style.top = `${((defaultViewport.height - charY) / defaultViewport.height) * 100}%`;
              highlightDiv.style.width = `${(item.width / defaultViewport.width) * 100}%`;
              highlightDiv.style.height = `${(item.height / defaultViewport.height) * 100}%`;
              highlightDiv.style.transform = 'translateY(-100%)';
              highlightLayer.appendChild(highlightDiv);
          });
      }

      // Scroll to the first highlighted page
      if (pageContainsHighlight && !hasScrolledToHighlight.current) {
          canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
          hasScrolledToHighlight.current = true;
      }

    } catch (e) {
      console.error(`Error rendering page ${pageNum}:`, e);
      // Don't set a global error for a single page failure in continuous scroll
    }
  }, [highlightText]);

  useEffect(() => {
    const loadPdf = async () => {
      setIsLoading(true);
      setError(null);
      setPdfDoc(null);
      setNumPages(0);
      canvasRefs.current.clear();
      highlightLayerRefs.current.clear();
      hasScrolledToHighlight.current = false;

      try {
        const fileReader = new FileReader();
        fileReader.onload = async (event) => {
          if (event.target?.result) {
            const doc = await pdfjsLib.getDocument(event.target.result as ArrayBuffer).promise;
            setPdfDoc(doc);
            setNumPages(doc.numPages);
          }
        };
        fileReader.onerror = () => {
          setError(t('pdfViewerErrorLoading'));
          setIsLoading(false);
        }
        fileReader.readAsArrayBuffer(file);
      } catch (e) {
        console.error(e);
        setError(t('pdfViewerErrorLoading'));
        setIsLoading(false);
      }
    };
    loadPdf();
  }, [file, t]);

  useEffect(() => {
    if (!pdfDoc || numPages === 0) {
      if (pdfDoc) setIsLoading(false); // Done loading, just no pages
      return;
    }
    
    const renderAllPages = async () => {
        // Reset highlights before re-rendering
        highlightLayerRefs.current.forEach(layer => {
            if (layer) layer.innerHTML = '';
        });
        hasScrolledToHighlight.current = false;

        const promises = [];
        for (let i = 1; i <= numPages; i++) {
            promises.push(renderPage(i, pdfDoc));
        }
        await Promise.all(promises);
        setIsLoading(false);
    };

    renderAllPages();

  }, [pdfDoc, numPages, renderPage]);
  
  if (error) {
    return <div className="text-red-400 p-4">{error}</div>;
  }
  
  return (
    <div className="flex flex-col h-full">
      <div ref={containerRef} className="flex-grow overflow-auto relative bg-gray-900">
        {isLoading && (
            <div className="absolute inset-0 bg-gray-800/50 flex items-center justify-center text-white z-10">
                {t('loadingDefault')}
            </div>
        )}
        {numPages > 0 && Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
            <div key={pageNum} className="relative mx-auto my-4 shadow-lg" style={{ width: 'fit-content' }}>
                <canvas 
                    ref={node => {
                        if (node) canvasRefs.current.set(pageNum, node);
                        else canvasRefs.current.delete(pageNum);
                    }}
                />
                <div 
                    ref={node => {
                        if (node) highlightLayerRefs.current.set(pageNum, node);
                        else highlightLayerRefs.current.delete(pageNum);
                    }}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                ></div>
            </div>
        ))}
      </div>
    </div>
  );
};
