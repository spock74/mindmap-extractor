import React, { useState, useRef, useMemo } from 'react';
import { useI18n } from '../../i18n';
import { GEMINI_MODELS, PROMPT_TEMPLATES } from '../../constants';

interface GenerateTabProps {
    isLoading: boolean;
    aiJsonOutput: string;
    pdfFile: File | null;
    setPdfFile: (file: File | null) => void;
    setIsPdfDrawerOpen: (isOpen: boolean) => void;
    handleFileGenerate: (
        selectedFile: File,
        prompt: string,
        model: string,
        maxConcepts: number,
        useFlexibleSchema: boolean
    ) => Promise<void>;
    handleStopGenerating: () => void;
}

export const GenerateTab: React.FC<GenerateTabProps> = ({
    isLoading,
    aiJsonOutput,
    pdfFile,
    setPdfFile,
    setIsPdfDrawerOpen,
    handleFileGenerate,
    handleStopGenerating,
}) => {
    const { t } = useI18n();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [model, setModel] = useState<string>(GEMINI_MODELS[1]);
    const [maxConcepts, setMaxConcepts] = useState<number>(10);
    const [useFlexibleSchema, setUseFlexibleSchema] = useState<boolean>(false);
    const availablePrompts = useMemo(() => PROMPT_TEMPLATES, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setSelectedFile(file);
        if (file && file.type === 'application/pdf') {
            setPdfFile(file);
            setIsPdfDrawerOpen(true);
        } else {
            setPdfFile(null);
        }
    };

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
    
    const onGenerateClick = () => {
        if (selectedFile) {
            handleFileGenerate(selectedFile, prompt, model, maxConcepts, useFlexibleSchema);
        }
    }

    return (
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
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer" title={t('flexibleSchemaDescription')}>
                    <input
                        type="checkbox"
                        checked={useFlexibleSchema}
                        onChange={(e) => setUseFlexibleSchema(e.target.checked)}
                        className="form-checkbox h-4 w-4 bg-gray-700 border-gray-600 rounded text-cyan-500 focus:ring-cyan-600 transition-colors"
                    />
                    {t('flexibleSchemaLabel')}
                </label>
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
                <input type="file" id="file-upload" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.txt,.md" className="hidden" />
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

            <div>
                <label htmlFor="ai-json-output" className="text-sm font-medium text-gray-300 mb-2 block">
                    {t('jsonOutputLabel')}
                </label>
                <textarea
                    id="ai-json-output"
                    value={aiJsonOutput}
                    readOnly
                    placeholder={t('jsonOutputPlaceholder')}
                    className="w-full h-32 p-3 bg-emerald-950/50 border border-gray-600 rounded-md text-gray-300 text-xs font-mono focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition duration-200"
                />
            </div>

            {isLoading ? (
                <button onClick={handleStopGenerating} className="mt-auto w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition duration-300">
                    {t('stopGeneratingButton')}
                </button>
            ) : (
                <button onClick={onGenerateClick} disabled={!selectedFile || prompt.trim() === ''} className="mt-auto w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed">
                    {t('generateWithAIButton')}
                </button>
            )}
        </div>
    );
};
