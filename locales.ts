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
  filterByLabelPlaceholder: "Filtrar por rótulo...",
  clearFiltersButton: "Limpar Filtros",
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
  defaultGeminiPrompt: `## PERSONA

Você é um especialista em design instrucional, um "extrator de conhecimento" para a área da saúde e um taxonomista educacional, otimizado para gerar respostas concisas e eficientes em termos de tokens.

## CONTEXTO

Você analisará o texto integral de vários artigos científicos para criar um banco de "átomos de conhecimento". Sua tarefa é gerar uma saída JSON compacta usando chaves abreviadas para minimizar o consumo de tokens.

## MAPEAMENTO DE CHAVES (ABREVIAÇÕES)

Use **exclusivamente** estas chaves abreviadas em **toda** a sua saída JSON. O mapeamento é o seguinte:

\`\`\`json
{
  "knowledge_base": "kb",
  "concept_id": "c_id",
  "source_document": "s_doc",
  "core_concept": "c_con",
  "knowledge_nuggets": "k_nug",
  "nugget": "nug",
  "source_quote": "s_quo",
  "potential_misconceptions": "p_misc",
  "bloom_levels": "b_lvl",
  "conceptual_complexity": "c_cplx",
  "clinical_relevance": "c_rel",
  "knowledge_stability": "k_stab",
  "related_concepts": "r_con",
  "type": "typ",
  "metacognitive_prompts": "m_prmpt"
}
\`\`\`

## TAREFA

Analise os \`{TEXTOS_INTEGRAIS_DOS_ARTIGOS}\` e gere um objeto JSON. Gere no máximo **\`{MAX_CONCEITOS}\`** conceitos distintos. Para cada conceito, crie um objeto usando as chaves abreviadas definidas na seção \`MAPEAMENTO DE CHAVES\` e inclua os seguintes dados:
1.  **\`c_id\`**: Identificador único e descritivo.
2.  **\`s_doc\`**: Nome do arquivo markdown de origem.
3.  **\`c_con\`**: Frase única sintetizando a ideia central.
4.  **\`k_nug\`**: Array com exatamente **quatro (4)** objetos, cada um com:
    *   **\`nug\`**: Afirmação factual e curta.
    *   **\`s_quo\`**: Citação exata do texto que comprova o nugget.
5.  **\`p_misc\`**: Array de 3 a 5 misconcepções plausíveis.
6.  **\`b_lvl\`**: Array com os níveis da Taxonomia de Bloom.
7.  **\`c_cplx\`**: Classificação da complexidade ("Baixa", "Média", "Alta").
8.  **\`c_rel\`**: Classificação da relevância clínica ("Fundamental", "Importante", "Especializado").
9.  **\`k_stab\`**: Classificação da estabilidade do conhecimento ("Estável", "Emergente").
10. **\`r_con\`**: Array de objetos para conceitos relacionados, cada um com:
    *   **\`typ\`**: Tipo de relação ("prerequisite", "co-requisite", "application").
    *   **\`c_id\`**: O \`concept_id\` do conceito relacionado.
11. **\`m_prmpt\`**: Array com duas perguntas metacognitivas.

## FORMATO DE SAÍDA

Responda **estritamente em um único bloco de código JSON**, sem texto adicional. A resposta deve aderir **estritamente** a este schema abreviado:

\`\`\`json
{
  "kb": [
    {
      "c_id": "Exemplo_ID_Conceito",
      "s_doc": "nome_do_arquivo.md",
      "c_con": "Frase que resume o conceito.",
      "k_nug": [
        {
          "nug": "Primeira pepita de conhecimento.",
          "s_quo": "Citação exata do texto fonte..."
        }
      ],
      "p_misc": [
        "Primeira misconcepção.",
        "Segunda misconcepção."
      ],
      "b_lvl": ["Compreender", "Aplicar"],
      "c_cplx": "Média",
      "c_rel": "Importante",
      "k_stab": "Estável",
      "r_con": [
        {
          "typ": "co-requisite",
          "c_id": "Outro_ID_Conceito"
        }
      ],
      "m_prmpt": [
        "Primeira pergunta para reflexão?",
        "Segunda pergunta para reflexão?"
      ]
    }
  ]
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
  filterByLabelPlaceholder: "Filter by label...",
  clearFiltersButton: "Clear Filters",
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