export const pt = {
  appTitle: "Graphfy",
  appDescription: "Visualize grafos de conhecimento de documentos JSON ou texto usando Gemini.",
  generateTab: "Gerar",
  manualTab: "Manual",
  historyTab: "Histórico",
  modelLabel: "Modelo",
  maxConceptsLabel: "Número Máximo de Conceitos",
  uploadLabel: "Carregar Documento (.pdf, .txt, .md)",
  selectFileButton: "Clique para selecionar um arquivo",
  selectedFile: "Selecionado: {{filename}}",
  promptLabel: "Prompt",
  promptPlaceholder: "Digite seu prompt aqui...",
  generateWithAIButton: "Gerar com IA",
  stopGeneratingButton: "Parar Geração",
  pasteJsonLabel: "Cole seu JSON aqui:",
  generateGraphButton: "Gerar Grafo",
  historyEmpty: "Nenhum histórico ainda. Gere um grafo a partir de um documento para vê-lo aqui.",
  historyLoadButton: "Carregar",
  historyDeleteButton: "Apagar",
  layoutDirectionTitle: "Direção do Layout",
  filtersTitle: "Filtros",
  filterByLabelPlaceholder: "Filtrar por rótulo do nó...",
  filterByEdgeLabelPlaceholder: "Filtrar por rótulo da aresta...",
  clearFiltersButton: "Limpar Filtros",
  bulkActionsTitle: "Ações em Lote ({{count}} selecionado(s))",
  deleteSelectedButton: "Apagar Nós Selecionados",
  loadingMessageReadingFile: "Lendo conteúdo do arquivo...",
  loadingMessageGenerating: "Gerando grafo com Gemini AI...",
  loadingMessageProcessing: "Processando dados do grafo...",
  loadingMessageApplyingFilters: "Aplicando filtros e layout...",
  loadingDefault: "Carregando...",
  errorGenerationFailed: "Falha na geração: {{error}}",
  errorGenerationCancelled: "Geração cancelada pelo usuário.",
  errorJsonValidation: "Falha na validação do JSON:\n{{errors}}",
  errorInvalidJson: "JSON inválido: {{error}}",
  languageLabel: "Idioma",
  layoutTB: "Cima para Baixo",
  layoutBT: "Baixo para Cima",
  layoutLR: "Esquerda para Direita",
  layoutRL: "Direita para Esquerda",
  layoutLR_CURVED: "Esquerda para Direita (Curvo)",
  defaultGeminiPrompt: `Você é um especialista em **Análise Crítica de Artigos Científicos** e Engenharia do Conhecimento, com foco em PNL Biomédica.

Sua tarefa é ler o texto fornecido e extrair as **principais** relações semânticas e causais **que representam os achados e conclusões DESTE ARTIGO**.

O formato da sua saída deve ser um único array JSON de fatos.
CADA fato deve ter a estrutura:
{
  "s": { "label": "Nome da Entidade", "type": "Tipo da Entidade" },
  "p": "Relação (Predicado)",
  "o": { "label": "Nome da Entidade", "type": "Tipo da Entidade" }
}

---
### REGRAS DE PRIORIZAÇÃO CRÍTICA

1.  **FOCO NOS ACHADOS:** Dê prioridade máxima aos fatos extraídos das seções de **Resultados**, **Discussão** e **Conclusões** do texto.
2.  **MANUSEIO DO CONTEXTO (INTRODUÇÃO):** Fatos da **Introdução** ou **Histórico** só devem ser extraídos se forem definições gerais (ex: "ICFEp é...") ou fatos de conhecimento comum que *contextualizam* o estudo.
3.  **REGRA DA CONTRADIÇÃO (A MAIS IMPORTANTE):** Se a Introdução menciona um fato sobre um grupo (ex: "Droga X reduz o risco em *Pacientes A*") e os Resultados/Conclusão do estudo atual encontram o oposto para o seu grupo de estudo (ex: "Droga X *aumenta* o risco em *Pacientes B*"), **VOCÊ DEVE PRIORIZAR E EXTRAIR O ACHADO DO ESTUDO ATUAL** (o risco aumentado no Paciente B) e **IGNORAR** o fato da introdução.

---
### Tipos de Entidade Permitidos:
- "mainConcept"
- "riskFactor"
- "comorbidity"
- "mechanism"
- "insight"
- "comparison"
- "diagnostic"
- "detail"
- "treatment"
- "drug"
- "population"
- "statistic"

---
### EXEMPLO DE EXTRAÇÃO (com Priorização):

* **Texto (Introdução):** "Estudos anteriores mostraram que a *Droga A* melhora a sobrevida na *População X*."
* **Texto (Resultados):** "Em nosso estudo, a *Droga A* **não** melhorou a sobrevida na *População Y* (HR 1.05)."
* **Extração Correta (Ignora a Introdução):**
    \`\`\`json
    {
      "s": { "label": "Droga A", "type": "drug" },
      "p": "não melhorou",
      "o": { "label": "sobrevida na População Y (HR 1.05)", "type": "insight" }
    }
    \`\`\`

* **Texto (Resultados):** "(E/E' > 15 sugere pressões de enchimento aumentadas)."
* **Extração Correta:**
    \`\`\`json
    {
      "s": { "label": "E/E' > 15", "type": "diagnostic" },
      "p": "sugere",
      "o": { "label": "pressões de enchimento aumentadas", "type": "insight" }
    }
    \`\`\`
`
};

export const en = {
  appTitle: "Graphfy",
  appDescription: "Visualize knowledge graphs from JSON or text documents using Gemini.",
  generateTab: "Generate",
  manualTab: "Manual",
  historyTab: "History",
  modelLabel: "Model",
  maxConceptsLabel: "Maximum Number of Concepts",
  uploadLabel: "Upload Document (.pdf, .txt, .md)",
  selectFileButton: "Click to select a file",
  selectedFile: "Selected: {{filename}}",
  promptLabel: "Prompt",
  promptPlaceholder: "Enter your prompt here...",
  generateWithAIButton: "Generate with AI",
  stopGeneratingButton: "Stop Generating",
  pasteJsonLabel: "Paste your JSON here:",
  generateGraphButton: "Generate Graph",
  historyEmpty: "No history yet. Generate a graph from a document to see it here.",
  historyLoadButton: "Load",
  historyDeleteButton: "Delete",
  layoutDirectionTitle: "Layout Direction",
  filtersTitle: "Filters",
  filterByLabelPlaceholder: "Filter by node label...",
  filterByEdgeLabelPlaceholder: "Filter by edge label...",
  clearFiltersButton: "Clear Filters",
  bulkActionsTitle: "Bulk Actions ({{count}} selected)",
  deleteSelectedButton: "Delete Selected Nodes",
  loadingMessageReadingFile: "Reading file content...",
  loadingMessageGenerating: "Generating graph with Gemini AI...",
  loadingMessageProcessing: "Processing graph data...",
  loadingMessageApplyingFilters: "Applying filters and layout...",
  loadingDefault: "Loading...",
  errorGenerationFailed: "Generation failed: {{error}}",
  errorGenerationCancelled: "Generation cancelled by user.",
  errorJsonValidation: "JSON validation failed:\n{{errors}}",
  errorInvalidJson: "Invalid JSON: {{error}}",
  languageLabel: "Language",
  layoutTB: "Top to Bottom",
  layoutBT: "Bottom to Top",
  layoutLR: "Left to Right",
  layoutRL: "Right to Left",
  layoutLR_CURVED: "Left to Right (Curved)",
  defaultGeminiPrompt: `You are an expert in **Critical Analysis of Scientific Papers** and Knowledge Engineering, focused on Biomedical NLP.

Your task is to read the provided text and extract the **main** semantic and causal relationships **that represent the findings and conclusions of THIS ARTICLE**.

The format of your output must be a single JSON array of facts.
EACH fact must have the structure:
{
  "s": { "label": "Entity Name", "type": "Entity Type" },
  "p": "Relationship (Predicate)",
  "o": { "label": "Entity Name", "type": "Entity Type" }
}

---
### CRITICAL PRIORITIZATION RULES

1.  **FOCUS ON FINDINGS:** Give maximum priority to facts extracted from the **Results**, **Discussion**, and **Conclusions** sections of the text.
2.  **CONTEXT HANDLING (BACKGROUND):** Facts from the **Introduction** or **Background** should only be extracted if they are general definitions (e.g., "HFpEF is...") or common knowledge facts that *contextualize* the study.
3.  **CONTRADICTION RULE (THE MOST IMPORTANT):** If the Background mentions a fact about a group (e.g., "Drug X reduces risk in *Patients A*") and the current study's Results/Conclusion find the opposite for its study group (e.g., "Drug X *increases* risk in *Patients B*"), **YOU MUST PRIORITIZE AND EXTRACT THE CURRENT STUDY'S FINDING** (the increased risk in Patient B) and **IGNORE** the background fact.

---
### Allowed Entity Types:
- "mainConcept"
- "riskFactor"
- "comorbidity"
- "mechanism"
- "insight"
- "comparison"
- "diagnostic"
- "detail"
- "treatment"
- "drug"
- "population"
- "statistic"

---
### EXTRACTION EXAMPLE (with Prioritization):

* **Text (Background):** "Previous studies have shown that *Drug A* improves survival in *Population X*."
* **Text (Results):** "In our study, *Drug A* did **not** improve survival in *Population Y* (HR 1.05)."
* **Correct Extraction (Ignores Background):**
    \`\`\`json
    {
      "s": { "label": "Drug A", "type": "drug" },
      "p": "did not improve",
      "o": { "label": "survival in Population Y (HR 1.05)", "type": "insight" }
    }
    \`\`\`

* **Text (Results):** "(E/E' > 15 suggests increased filling pressures)."
* **Correct Extraction:**
    \`\`\`json
    {
      "s": { "label": "E/E' > 15", "type": "diagnostic" },
      "p": "suggests",
      "o": { "label": "increased filling pressures", "type": "insight" }
    }
    \`\`\`
`
};