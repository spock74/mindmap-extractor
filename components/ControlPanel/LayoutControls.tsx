import React from 'react';
import { useI18n } from '../../i18n';
import { LAYOUTS } from '../../constants';

interface LayoutControlsProps {
    layout: string;
    setLayout: (layout: string) => void;
    isLoading: boolean;
    jsonInput: string;
    handleGenerateGraphFromJson: () => void;
}

export const LayoutControls: React.FC<LayoutControlsProps> = ({ layout, setLayout, isLoading, jsonInput, handleGenerateGraphFromJson }) => {
    const { t } = useI18n();
    return (
        <div className="mt-6 pt-4 border-t border-gray-700">
            <h2 className="text-sm font-medium text-gray-300 mb-3">{t('layoutDirectionTitle')}</h2>
            <div className="grid grid-cols-2 gap-2">
                {(Object.keys(LAYOUTS) as Array<keyof typeof LAYOUTS>).map((dir) => (
                    <button
                        key={dir}
                        onClick={() => setLayout(dir)}
                        className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors duration-200 ${layout === dir ? 'bg-cyan-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                    >
                        {t(LAYOUTS[dir])}
                    </button>
                ))}
            </div>
            <button
                onClick={handleGenerateGraphFromJson}
                disabled={isLoading || !jsonInput.trim()}
                className="mt-4 w-full py-2 px-3 text-xs font-semibold rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
                title={!jsonInput.trim() ? 'No JSON data to process' : 'Regenerate graph from JSON input'}
            >
                {t('regenerateGraphButton')}
            </button>
        </div>
    );
};
