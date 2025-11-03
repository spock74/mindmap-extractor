import React from 'react';
import { useI18n } from '../../i18n';

interface BulkActionsProps {
    selectedNodeIdsForActions: string[];
    canCollapseSelected: boolean;
    canExpandSelected: boolean;
    handleCollapseSelectedNodes: () => void;
    handleExpandSelectedNodes: () => void;
    handleGroupSelectedNodes: () => void;
    handleDeleteSelectedNodes: () => void;
}

export const BulkActions: React.FC<BulkActionsProps> = ({
    selectedNodeIdsForActions,
    canCollapseSelected,
    canExpandSelected,
    handleCollapseSelectedNodes,
    handleExpandSelectedNodes,
    handleGroupSelectedNodes,
    handleDeleteSelectedNodes
}) => {
    const { t } = useI18n();

    if (selectedNodeIdsForActions.length === 0) {
        return null;
    }

    return (
        <div className="mt-6 pt-4 border-t border-gray-700">
            <h2 className="text-sm font-medium text-gray-300 mb-3">
                {t('bulkActionsTitle', { count: selectedNodeIdsForActions.length })}
            </h2>
            <div className="flex flex-col gap-2">
                 <button
                    onClick={handleCollapseSelectedNodes}
                    disabled={!canCollapseSelected}
                    className="w-full py-2 px-3 text-xs font-semibold rounded-md bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                    {t('collapseSelectedButton')}
                </button>
                <button
                    onClick={handleExpandSelectedNodes}
                    disabled={!canExpandSelected}
                    className="w-full py-2 px-3 text-xs font-semibold rounded-md bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                    {t('expandSelectedButton')}
                </button>
                <button
                    onClick={handleGroupSelectedNodes}
                    disabled={selectedNodeIdsForActions.length < 2}
                    className="w-full py-2 px-3 text-xs font-semibold rounded-md bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                    {t('groupSelectedButton')}
                </button>
                <button
                    onClick={handleDeleteSelectedNodes}
                    className="w-full py-2 px-3 text-xs font-semibold rounded-md bg-red-800 hover:bg-red-700 text-white transition-colors mt-2"
                >
                    {t('deleteSelectedButton')}
                </button>
            </div>
        </div>
    );
};
