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
  defaultGeminiPrompt: `# PROMPT APRIMORADO PARA GERAÇÃO DE GRAFO DE CONHECIMENTO (v4.0)

## PERSONA
> Você é um Engenheiro de Ontologias e Grafos de Conhecimento. Sua missão é modelar informações complexas de textos científicos em uma estrutura de grafo JSON hierárquica, semanticamente rica e logicamente coesa, adequada para visualização de dados.

## CONTEXTO
> Você analisará um texto-fonte que resume as abordagens terapêuticas para a Insuficiência Cardíaca Diastólica (ICD). Sua tarefa é decompor este texto em um modelo de conhecimento, representando-o como um grafo de nós e arestas.

## TAREFA
> Analise o \`{TEXTO_DE_ENTRADA}\` e modele seu conteúdo em um formato de grafo JSON. Siga rigorosamente os princípios de modelagem e as regras de formatação abaixo.

### PRINCÍPIOS DE MODELAGEM DO GRAFO

1.  **Extração Estruturada (Processo Interno):** Antes de gerar o JSON, realize internamente uma extração de dados. Para cada terapia ou alvo mencionado, identifique: o **Alvo** (ex: Miosina), o **Mecanismo** (ex: Inibição da ATPase), a **Evidência** (ex: Aprovado para CMH, resultados em HFpEF), e os **Desafios/Limitações** (ex: Eficácia pode variar).

2.  **Síntese Hierárquica Lógica:** Organize os nós extraídos em uma hierarquia clara e profunda que flua do geral para o específico. A estrutura geral deve seguir a lógica:
    *   **Nível 0 (Raiz):** \`Insuficiência Cardíaca Diastólica\`
    *   **Nível 1 (Categorias):** \`Terapias Atuais\`, \`Novas Estratégias\`
    *   **Nível 2 (Alvos Terapêuticos):** \`Matriz Extracelular\`, \`Sarcômero\`, \`Mitocôndrias\`
    *   **Nível 3 (Sub-Alvos/Mecanismos):** \`Miosina\`, \`Titin\`, \`Estresse Oxidativo\`
    *   **Nível 4+ (Detalhes):** \`Inibidores (Mavacamten)\`, \`Evidência Clínica\`, \`Desafios de Translação\`

3.  **Riqueza Semântica (Tipos e Relações):**
    *   **Tipos de Nós:** Classifique cada nó com um \`type\` que descreva sua função no grafo (veja as regras abaixo). Isso é mais importante do que a diferenciação genérica "input/default/output".
    *   **Relações (Arestas):** As arestas devem ter um \`label\` que descreva a natureza da conexão (ex: \`inclui\`, \`ageEm\`, \`temMecanismo\`, \`apresentaDesafio\`).

### REGRAS DE FORMATAÇÃO PARA A SAÍDA JSON

#### **Nós (\`nodes\`)**
> Cada nó deve ser um objeto com:
> *   \`id\`: String única em **kebab-case** (ex: \`inibidores-miosina\`).
> *   \`label\`: Texto descritivo e conciso para o nó.
> *   \`type\`: Classificação semântica do nó. Use **estritamente** um dos seguintes:
>     *   \`mainConcept\`: Para o nó raiz.
>     *   \`category\`: Para as principais divisões (ex: Terapias Atuais, Novas Estratégias).
>     *   \`target\`: Para alvos terapêuticos (ex: Sarcômero, MEC).
>     *   \`mechanism\`: Para mecanismos de ação ou processos fisiopatológicos.
>     *   \`evidence\`: Para resultados de estudos, status de aprovação, ou conclusões.
>     *   \`challenge\`: Para limitações, efeitos colaterais ou desafios de translação.
>     *   \`drugClass\`: Para classes de medicamentos (ex: Beta-bloqueadores).

#### **Arestas (\`edges\`)**
> Cada aresta deve ser um objeto com:
> *   \`id\`: String única para a aresta (ex: \`e1-2\`).
> *   \`source\`: O \`id\` do nó de origem.
> *   \`target\`: O \`id\` do nó de destino.
> *   \`label\`: **(Opcional, mas preferível)** Uma string curta descrevendo a relação (ex: "inclui", "age através de", "resulta em", "é limitado por").

## FORMATO DE SAÍDA
> Responda **estritamente em um único bloco de código JSON**, sem texto adicional. A estrutura deve ser a seguinte:

\`\`\`json
{
  "result": {
    "title": "Terapias para Insuficiência Cardíaca Diastólica: Atuais e Emergentes",
    "nodes": [
      {
        "id": "main",
        "label": "Insuficiência Cardíaca Diastólica (ICD)",
        "type": "mainConcept"
      },
      {
        "id": "terapias-atuais",
        "label": "Terapias Atuais",
        "type": "category"
      },
      {
        "id": "beta-bloqueadores",
        "label": "Beta-bloqueadores",
        "type": "drugClass"
      }
    ],
    "edges": [
      {
        "id": "e-main-terapias",
        "source": "main",
        "target": "terapias-atuais",
        "label": "abordada por"
      },
      {
        "id": "e-terapias-betablock",
        "source": "terapias-atuais",
        "target": "beta-bloqueadores",
        "label": "inclui"
      }
    ]
  }
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