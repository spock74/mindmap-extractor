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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const highlightLayerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc) return;
    setIsLoading(true);
    if (highlightLayerRef.current) {
        highlightLayerRef.current.innerHTML = '';
    }

    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // FIX: The `@ts-expect-error` directive was unused, indicating that the type
      // definitions for `pdfjs-dist` likely no longer have the issue that required a
      // workaround. The `render` method correctly accepts `canvasContext`.
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      await page.render(renderContext).promise;
      
      // After rendering, apply highlights
      const textContent = await page.getTextContent();
      const textItems = textContent.items as TextItemWithCoords[];
      
      const normalizedHighlight = highlightText.replace(/\s+/g, ' ').trim();
      const normalizedPageText = textItems.map(item => item.str).join(' ').replace(/\s+/g, ' ');

      if (normalizedPageText.includes(normalizedHighlight)) {
        let startIndex = 0;
        let itemIndex = 0;
        
        while((startIndex = normalizedPageText.indexOf(normalizedHighlight, startIndex)) !== -1) {
            const endIndex = startIndex + normalizedHighlight.length;
            let currentLen = 0;
            const highlightItems: TextItemWithCoords[] = [];

            for(let i = itemIndex; i < textItems.length; i++){
                const itemText = textItems[i].str.replace(/\s+/g, ' ');
                const nextLen = currentLen + itemText.length;
                if(nextLen > startIndex){
                    highlightItems.push(textItems[i]);
                }
                currentLen = nextLen;
                if(currentLen >= endIndex){
                    itemIndex = i;
                    break;
                }
            }
            
            highlightItems.forEach(item => {
                const defaultViewport = page.getViewport({ scale: 1 });
                const [fontSize, , , , charX, charY] = item.transform;
                const highlightDiv = document.createElement('div');
                highlightDiv.style.position = 'absolute';
                highlightDiv.style.backgroundColor = 'rgba(255, 255, 0, 0.4)';
                highlightDiv.style.left = `${(charX / defaultViewport.width) * 100}%`;
                highlightDiv.style.top = `${((defaultViewport.height - charY) / defaultViewport.height) * 100}%`;
                highlightDiv.style.width = `${(item.width / defaultViewport.width) * 100}%`;
                highlightDiv.style.height = `${(item.height / defaultViewport.height) * 100}%`;
                highlightDiv.style.transform = 'translateY(-100%)';
                highlightLayerRef.current?.appendChild(highlightDiv);
            });

            startIndex += normalizedHighlight.length;
        }
      }

    } catch (e) {
      console.error(e);
      setError(t('pdfViewerErrorRendering'));
    } finally {
      setIsLoading(false);
    }
  }, [pdfDoc, highlightText, t]);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const fileReader = new FileReader();
        fileReader.onload = async (event) => {
          if (event.target?.result) {
            const doc = await pdfjsLib.getDocument(event.target.result as ArrayBuffer).promise;
            setPdfDoc(doc);
            setNumPages(doc.numPages);

            // Find which page contains the highlight text
            let foundPage = 1;
            for (let i = 1; i <= doc.numPages; i++) {
                const page = await doc.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                if (pageText.includes(highlightText)) {
                    foundPage = i;
                    break;
                }
            }
            setCurrentPage(foundPage);
          }
        };
        fileReader.readAsArrayBuffer(file);
      } catch (e) {
        console.error(e);
        setError(t('pdfViewerErrorLoading'));
      }
    };
    loadPdf();
  }, [file, highlightText, t]);

  useEffect(() => {
    if (pdfDoc) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, renderPage]);

  const goToPrevPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(numPages, prev + 1));
  
  if (error) {
    return <div className="text-red-400 p-4">{error}</div>;
  }
  
  return (
    <div className="flex flex-col h-full">
      {pdfDoc && (
        <div className="flex justify-between items-center p-2 bg-gray-900 flex-shrink-0">
            <button onClick={goToPrevPage} disabled={currentPage <= 1} className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50 text-white">&lt;</button>
            <span className="text-sm text-gray-300">
                {t('pdfViewerPageLabel', { currentPage, numPages })}
            </span>
            <button onClick={goToNextPage} disabled={currentPage >= numPages} className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50 text-white">&gt;</button>
        </div>
      )}
      <div className="flex-grow overflow-auto relative">
        {isLoading && <div className="absolute inset-0 bg-gray-800/50 flex items-center justify-center text-white">{t('loadingDefault')}</div>}
        <div style={{ position: 'relative' }}>
          <canvas ref={canvasRef} />
          <div ref={highlightLayerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}></div>
        </div>
      </div>
    </div>
  );
};
