import React from 'react';
import { useI18n } from '../../i18n';

interface FilterControlsProps {
    labelFilter: string;
    setLabelFilter: (value: string) => void;
    edgeLabelFilter: string;
    setEdgeLabelFilter: (value: string) => void;
    typeFilters: Set<string>;
    availableTypes: string[];
    handleTypeFilterChange: (type: string) => void;
    handleClearFilters: () => void;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
    labelFilter,
    setLabelFilter,
    edgeLabelFilter,
    setEdgeLabelFilter,
    typeFilters,
    availableTypes,
    handleTypeFilterChange,
    handleClearFilters
}) => {
    const { t } = useI18n();

    const hasActiveFilters = labelFilter.trim() !== '' || typeFilters.size > 0 || edgeLabelFilter.trim() !== '';

    return (
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
                <input
                    type="text"
                    placeholder={t('filterByEdgeLabelPlaceholder')}
                    value={edgeLabelFilter}
                    onChange={e => setEdgeLabelFilter(e.target.value)}
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
                 { hasActiveFilters && (
                    <button
                        onClick={handleClearFilters}
                        className="w-full py-2 px-3 text-xs font-semibold rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                    >
                        {t('clearFiltersButton')}
                    </button>
                 )}
            </div>
        </div>
    );
};
