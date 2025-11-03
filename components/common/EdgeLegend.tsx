import React from 'react';
import { useI18n } from '../../i18n';

export const EdgeLegend: React.FC = () => {
    const { t } = useI18n();

    const legendItems = [
        { label: t('positiveStrong'), color: '#48BB78', width: 3, dash: 'none' },
        { label: t('positiveModerate'), color: '#48BB78', width: 2, dash: 'none' },
        { label: t('positiveWeak'), color: '#48BB78', width: 1, dash: '5 5' },
        { label: t('negativeStrong'), color: '#F56565', width: 3, dash: 'none' },
        { label: t('negativeModerate'), color: '#F56565', width: 2, dash: 'none' },
        { label: t('negativeWeak'), color: '#F56565', width: 1, dash: '5 5' },
        { label: t('neutral'), color: '#A0AEC0', width: 2, dash: 'none' },
    ];

    return (
        <div className="absolute bottom-4 right-4 bg-gray-900/80 p-3 rounded-lg border border-gray-700 text-white text-xs z-10 w-48">
            <h3 className="font-bold mb-2 text-center text-gray-300">{t('edgeLegendTitle')}</h3>
            <div className="space-y-2">
                {legendItems.map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                        <svg width="30" height="10" viewBox="0 0 30 10">
                            <line
                                x1="0"
                                y1="5"
                                x2="30"
                                y2="5"
                                stroke={item.color}
                                strokeWidth={item.width}
                                strokeDasharray={item.dash}
                            />
                        </svg>
                        <span className="text-gray-400">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
