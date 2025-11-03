import React from 'react';
import { useI18n } from '../../i18n';

interface ManualTabProps {
    jsonInput: string;
    setJsonInput: (value: string) => void;
    isLoading: boolean;
    handleGenerateGraphFromJson: () => void;
}

export const ManualTab: React.FC<ManualTabProps> = ({ jsonInput, setJsonInput, isLoading, handleGenerateGraphFromJson }) => {
    const { t } = useI18n();
    return (
        <div className="flex flex-col gap-4 flex-grow">
            <div className="flex-grow flex flex-col">
                <label htmlFor="json-input" className="text-sm font-medium text-gray-300 mb-2">
                    {t('pasteJsonLabel')}
                </label>
                <textarea
                    id="json-input"
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    className="w-full flex-grow p-3 bg-gray-800 border border-gray-600 rounded-md text-gray-200 text-xs font-mono focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition duration-200"
                    placeholder="Enter JSON data..."
                />
            </div>
            <button
                onClick={handleGenerateGraphFromJson}
                disabled={isLoading || !jsonInput.trim()}
                className="mt-auto w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
                {t('generateGraphButton')}
            </button>
        </div>
    );
};
