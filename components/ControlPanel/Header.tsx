import React from 'react';
import { useI18n } from '../../i18n';
import { BrazilFlagIcon, USFlagIcon, CloseIcon } from '../common/Icons';

interface HeaderProps {
    toggleLanguage: () => void;
    language: string;
    onClose: () => void;
}

export const Header: React.FC<HeaderProps> = ({ toggleLanguage, language, onClose }) => {
    const { t } = useI18n();
    return (
        <header className="mb-4 flex-shrink-0">
            <div className="grid grid-cols-3 items-center">
                <div className="flex justify-start">
                     <button
                        onClick={toggleLanguage}
                        className="p-2 rounded-md hover:bg-gray-800 transition-colors"
                        aria-label={t('languageLabel')}
                        title={t('changeLanguageTooltip')}
                    >
                        {language === 'pt' ? <BrazilFlagIcon /> : <USFlagIcon />}
                    </button>
                </div>
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-cyan-400">{t('appTitle')}</h1>
                </div>
                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                        aria-label={t('closePanel')}
                        title={t('closePanel')}
                    >
                        <CloseIcon />
                    </button>
                </div>
            </div>
            <p className="text-sm text-gray-400 mt-1 text-center">{t('appDescription')}</p>
        </header>
    );
};
