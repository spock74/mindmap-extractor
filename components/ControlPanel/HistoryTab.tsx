import React from 'react';
import { useI18n } from '../../i18n';
import { HistoryItem } from '../../types';

interface HistoryTabProps {
    history: HistoryItem[];
    handleSelectHistoryItem: (item: HistoryItem) => void;
    handleDeleteHistoryItem: (id: string) => void;
    setActiveTab: (tab: 'generate' | 'manual' | 'history') => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ history, handleSelectHistoryItem, handleDeleteHistoryItem, setActiveTab }) => {
    const { t } = useI18n();
    
    const onSelect = (item: HistoryItem) => {
        handleSelectHistoryItem(item);
        setActiveTab('manual');
    }

    return (
        <div className="flex flex-col gap-2 flex-grow">
            {history.length === 0 ? (
                <p className="text-gray-500 text-sm text-center mt-4">{t('historyEmpty')}</p>
            ) : (
                history.map(item => (
                    <div key={item.id} className="bg-gray-800 p-3 rounded-md border border-gray-700 text-xs">
                        <div className="font-bold text-gray-300 truncate">{item.filename}</div>
                        <p className="text-gray-400 mt-1 italic truncate">"{item.prompt}"</p>
                        <div className="text-gray-500 text-[10px] mt-2">{new Date(item.timestamp).toLocaleString()}</div>
                        <div className="flex gap-2 mt-2">
                            <button onClick={() => onSelect(item)} className="flex-1 bg-cyan-700 hover:bg-cyan-600 text-white text-xs py-1 px-2 rounded">{t('historyLoadButton')}</button>
                            <button onClick={() => handleDeleteHistoryItem(item.id)} className="bg-red-800 hover:bg-red-700 text-white text-xs py-1 px-2 rounded">{t('historyDeleteButton')}</button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};
