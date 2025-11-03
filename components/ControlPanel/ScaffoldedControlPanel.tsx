import React, { useState, useMemo } from 'react';
import { useI18n } from '../../i18n';
import { PROMPT_TEMPLATES, GEMINI_MODELS, LAYOUTS } from '../../constants';

export const ScaffoldedControlPanel: React.FC<{ tabName: string }> = ({ tabName }) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'generate' | 'manual' | 'history'>('generate');
  const availablePrompts = useMemo(() => PROMPT_TEMPLATES, []);
  
  const handleScaffoldAction = (action: string) => {
    console.log(`Action triggered in '${tabName}' tab: ${action}`);
  };

  return (
    <>
      <div className="flex border-b border-gray-700 mb-4 sticky top-0 bg-gray-900">
          { (['generate', 'manual', 'history'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`capitalize text-sm font-medium py-2 px-4 border-b-2 transition-colors duration-200 ${activeTab === tab ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400 hover:text-white'}`}>
                  {t(`${tab}Tab`)}
              </button>
          ))}
      </div>

      <div className="flex-grow flex flex-col min-h-0">
        {activeTab === 'generate' && (
           <div className="flex flex-col gap-4 flex-grow">
              <div>
                <label htmlFor="model-select-scaffold" className="text-sm font-medium text-gray-300 mb-2 block">
                  {t('modelLabel')}
                </label>
                <select id="model-select-scaffold" value={GEMINI_MODELS[1]} disabled className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-gray-200 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition duration-200 disabled:opacity-50">
                  {GEMINI_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-not-allowed opacity-50" title={t('flexibleSchemaDescription')}>
                  <input type="checkbox" disabled className="form-checkbox h-4 w-4 bg-gray-700 border-gray-600 rounded text-cyan-500 focus:ring-cyan-600 transition-colors" />
                  {t('flexibleSchemaLabel')}
                </label>
              </div>

              <div>
                <label htmlFor="max-concepts-input-scaffold" className="text-sm font-medium text-gray-300 mb-2 block">
                  {t('maxConceptsLabel')}
                </label>
                <input id="max-concepts-input-scaffold" type="number" value={10} disabled className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-gray-200 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition duration-200 disabled:opacity-50" />
              </div>
            
              <div>
                  <label htmlFor="file-upload-scaffold" className="text-sm font-medium text-gray-300 mb-2 block">
                      {t('uploadLabel')}
                  </label>
                  <button disabled className="w-full text-sm p-3 bg-gray-800 border border-dashed border-gray-600 rounded-md text-gray-400 disabled:opacity-50 cursor-not-allowed">
                      {t('selectFileButton')}
                  </button>
              </div>

              <div>
                  <label htmlFor="prompt-select-scaffold" className="text-sm font-medium text-gray-300 mb-2 block">
                      {t('selectPromptLabel')}
                  </label>
                  <select id="prompt-select-scaffold" defaultValue="" disabled className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-gray-200 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition duration-200 disabled:opacity-50">
                      <option value="">{t('selectPromptPlaceholder')}</option>
                      {availablePrompts.map(p => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                  </select>
              </div>

              <div className="flex flex-col flex-grow">
                  <label htmlFor="prompt-input-scaffold" className="text-sm font-medium text-gray-300 mb-2">
                      {t('promptLabel')}
                  </label>
                  <textarea id="prompt-input-scaffold" disabled className="w-full flex-grow p-3 bg-gray-800 border border-gray-600 rounded-md text-gray-200 text-xs font-mono focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition duration-200 disabled:opacity-50" placeholder={t('promptPlaceholder')} />
              </div>
              
              <button onClick={() => handleScaffoldAction('Generate with AI')} className="mt-auto w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition duration-300">
                  {t('generateWithAIButton')}
              </button>
          </div>
        )}

        {activeTab === 'manual' && (
          <div className="flex flex-col gap-4 flex-grow">
              <div className="flex-grow flex flex-col">
                  <label htmlFor="json-input-scaffold" className="text-sm font-medium text-gray-300 mb-2">
                      {t('pasteJsonLabel')}
                  </label>
                  <textarea id="json-input-scaffold" disabled className="w-full flex-grow p-3 bg-gray-800 border border-gray-600 rounded-md text-gray-200 text-xs font-mono focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition duration-200 disabled:opacity-50" placeholder="Enter JSON data..." />
              </div>
              <button onClick={() => handleScaffoldAction('Generate Graph')} className="mt-auto w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition duration-300">
                  {t('generateGraphButton')}
              </button>
          </div>
        )}
          
        {activeTab === 'history' && (
           <div className="flex flex-col gap-2 flex-grow">
              <p className="text-gray-500 text-sm text-center mt-4">{t('historyEmpty')}</p>
          </div>
        )}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-700">
          <h2 className="text-sm font-medium text-gray-300 mb-3">{t('layoutDirectionTitle')}</h2>
          <div className="grid grid-cols-2 gap-2">
              {(Object.keys(LAYOUTS) as Array<keyof typeof LAYOUTS>).map((dir) => (
                  <button
                      key={dir}
                      onClick={() => handleScaffoldAction(`Set layout to ${dir}`)}
                      className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors duration-200 bg-gray-700 hover:bg-gray-600 text-gray-300`}
                  >
                      {t(LAYOUTS[dir])}
                  </button>
              ))}
          </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-700">
          <h2 className="text-sm font-medium text-gray-300 mb-3">{t('filtersTitle')}</h2>
          <div className="flex flex-col gap-4">
              <input type="text" placeholder={t('filterByLabelPlaceholder')} disabled className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-gray-200 text-sm disabled:opacity-50" />
              <input type="text" placeholder={t('filterByEdgeLabelPlaceholder')} disabled className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-gray-200 text-sm disabled:opacity-50" />
              <div className="grid grid-cols-2 gap-2 text-sm opacity-50">
                  <label className="flex items-center gap-2 text-gray-300 cursor-not-allowed">
                      <input type="checkbox" disabled className="form-checkbox h-4 w-4 bg-gray-700 border-gray-600 rounded text-cyan-500" />
                      <span className="capitalize">riskFactor</span>
                  </label>
                  <label className="flex items-center gap-2 text-gray-300 cursor-not-allowed">
                      <input type="checkbox" disabled className="form-checkbox h-4 w-4 bg-gray-700 border-gray-600 rounded text-cyan-500" />
                      <span className="capitalize">treatment</span>
                  </label>
              </div>
              <button
                  onClick={() => handleScaffoldAction('Clear Filters')}
                  className="w-full py-2 px-3 text-xs font-semibold rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
              >
                  {t('clearFiltersButton')}
              </button>
          </div>
      </div>
    </>
  );
};
