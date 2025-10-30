


export const PROMPT_TEMPLATES = [
  {
    id: 'extracao-simples-com-rastreabilidade',
    title: 'Extração Simples com Rastreabilidade (Triplets)',
    content: `Você é um especialista em **Análise Crítica de Artigos Científicos** e Engenharia do Conhecimento, com foco em PNL Biomédica.

Sua tarefa é ler o texto fornecido e extrair as **principais** relações semânticas e causais **que representam os achados e conclusões DESTE ARTIGO**.

O formato da sua saída deve ser um único array JSON de fatos.
CADA fato deve ter a estrutura:
{
  "s": { "label": "Nome da Entidade", "type": "Tipo da Entidade" },
  "p": "Relação (Predicado)",
  "o": { "label": "Nome da Entidade", "type": "Tipo da Entidade" },
  "source_quote": "A sentença exata do texto original que justifica este fato."
}

---
### REGRAS DE EXTRAÇÃO E PRIORIZAÇÃO

1.  **CITAÇÃO DE ORIGEM É OBRIGATÓRIA:** Para cada fato extraído, você DEVE incluir o campo \`source_quote\`. A citação deve ser a sentença exata e não modificada do texto original que contém a informação para o fato.
2.  **FOCO NOS ACHADOS:** Dê prioridade máxima aos fatos extraídos das seções de **Resultados**, **Discussão** e **Conclusões** do texto.
3.  **MANUSEIO DO CONTEXTO (INTRODUÇÃO):** Fatos da **Introdução** ou **Histórico** só devem ser extraídos se forem definições gerais (ex: "ICFEp é...") ou fatos de conhecimento comum que *contextualizam* o estudo.
4.  **REGRA DA CONTRADIÇÃO (A MAIS IMPORTANTE):** Se a Introdução menciona um fato sobre um grupo (ex: "Droga X reduz o risco em *Pacientes A*") e os Resultados/Conclusão do estudo atual encontram o oposto para o seu grupo de estudo (ex: "Droga X *aumenta* o risco em *Pacientes B*"), **VOCÊ DEVE PRIORIZAR E EXTRAIR O ACHADO DO ESTUDO ATUAL** (o risco aumentado no Paciente B) e **IGNORAR** o fato da introdução.

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

* **Texto (Resultados):** "Em nosso estudo, a Droga A não melhorou a sobrevida na População Y (HR 1.05)."
* **Extração Correta:**
    \`\`\`json
    {
      "s": { "label": "Droga A", "type": "drug" },
      "p": "não melhorou",
      "o": { "label": "sobrevida na População Y (HR 1.05)", "type": "insight" },
      "source_quote": "Em nosso estudo, a Droga A não melhorou a sobrevida na População Y (HR 1.05)."
    }
    \`\`\`
---

Artigo:

{TEXTO_DE_ENTRADA}`
  },
  {
    id: 'prompt-mestre-grafo-hierarquico',
    title: 'PROMPT MESTRE P/ GRAFO DE CONHECIMENTO (v5.0)',
    content: `Você é um Engenheiro de Ontologias e Grafos de Conhecimento. Sua missão é modelar informações complexas de textos científicos em uma estrutura de grafo JSON hierárquica, semanticamente rica e logicamente coesa, adequada para visualização de dados.

## CONTEXTO
Você analisará um texto-fonte científico. Sua tarefa é decompor este texto em um modelo de conhecimento, representando-o como um grafo de nós e arestas.

## TAREFA
Analise o artigo e modele seu conteúdo em um formato de grafo JSON. Siga rigorosamente os princípios de modelagem e as regras de formatação abaixo.

### PRINCÍPIOS DE MODELAGEM DO GRAFO

1.  **Extração Estruturada (Seu Processo Interno):** Antes de gerar o JSON, realize internamente uma análise para identificar as entidades e relações fundamentais do texto. Para cada tópico principal, identifique:
    *   **Conceitos-Chave:** As principais entidades, teorias ou objetos de estudo.
    *   **Processos/Mecanismos:** Como os conceitos-chave funcionam ou interagem.
    *   **Evidências/Resultados:** Dados, achados de estudos ou exemplos que suportam uma afirmação.
    *   **Implicações/Desafios:** As consequências, aplicações, limitações ou direções futuras relacionadas a um conceito.

2.  **Síntese Hierárquica Lógica:** Organize os nós extraídos em uma hierarquia clara e profunda que flua do geral para o específico. A estrutura deve seguir uma lógica natural:
    *   **Nível 0 (Raiz):** O tópico central e abrangente do texto.
    *   **Nível 1 (Categorias):** As principais seções, temas ou divisões lógicas do tópico central.
    *   **Nível 2 (Sub-temas):** A decomposição de cada categoria em seus componentes ou conceitos principais.
    *   **Nível 3+ (Detalhes):** Nós que descrevem mecanismos, propriedades, evidências, exemplos ou desafios relacionados aos sub-temas.

3.  **Riqueza Semântica (Tipos e Relações):**
    *   **Tipos de Nós:** Classifique cada nó com um \`type\` que descreva sua função no grafo. Isso é crucial para dar significado à visualização.
    *   **Relações (Arestas):** Use o campo \`label\` nas arestas para descrever a natureza exata da conexão entre os nós, tornando o grafo autoexplicativo.

4.  **Rastreabilidade Obrigatória:** Cada nó gerado DEVE conter um campo \`source_quote\` com a sentença exata do texto original que justifica sua criação. Isso é fundamental para a auditoria e validação do conhecimento extraído.

### REGRAS DE FORMATAÇÃO PARA A SAÍDA JSON

#### **Nós (\`nodes\`)**
Cada nó deve ser um objeto com:
*   \`id\`: String única em **kebab-case** (ex: \`termodinamica-estatistica\`).
*   \`label\`: Texto descritivo e conciso para o nó.
*   \`type\`: Classificação semântica do nó. Use **estritamente** um dos seguintes valores, com base na função do nó no grafo:
    *   \`mainConcept\`: Para o único nó raiz.
    *   \`category\`: Para as principais divisões temáticas (ex: "Metodologia", "Resultados", "Aplicações").
    *   \`keyConcept\`: Para uma teoria, entidade ou componente central (ex: "Entropia", "Seleção Natural", "Proteína Spike").
    *   \`process\`: Para um mecanismo de ação ou processo dinâmico (ex: "Replicação Viral", "Fosforilação Oxidativa").
    *   \`property\`: Para uma característica ou atributo de um \`keyConcept\` (ex: "Alta Afinidade de Ligação", "Ponto de Ebulição").
    *   \`method\`: Para uma técnica, metodologia ou abordagem experimental (ex: "Cromatografia Gasosa", "Análise de Regressão").
    *   \`finding\`: Para um resultado, conclusão ou evidência empírica (ex: "Correlação Positiva Encontrada", "Hipótese Refutada").
    *   \`implication\`: Para uma consequência, desafio, aplicação prática ou direção futura (ex: "Desafio de Escalabilidade", "Potencial Terapêutico").
    *   \`example\`: Para um caso de estudo ou exemplo concreto (ex: "O caso da Penicilina", "Modelo Murino XYZ").
*   \`source_quote\`: **(OBRIGATÓRIO)** A sentença exata e não modificada do texto original que justifica a criação deste nó.

#### **Arestas (\`edges\`)**
Cada aresta deve ser um objeto com:
*   \`id\`: String única para a aresta (ex: \`e1-2\`).
*   \`source\`: O \`id\` do nó de origem.
*   \`target\`: O \`id\` do nó de destino.
*   \`label\`: **(Opcional, mas altamente recomendado)** Uma string curta descrevendo a relação. Exemplos de \`label\`s úteis:
    *   **Hierárquicas:** \`é_dividido_em\`, \`contém\`, \`é_exemplo_de\`
    *   **Causais:** \`causa\`, \`resulta_em\`, \`influencia\`, \`inibe\`
    *   **Descritivas:** \`tem_propriedade\`, \`é_caracterizado_por\`
    *   **Comparativas:** \`contrasta_com\`, \`é_análogo_a\`
    *   **Procedimentais:** \`usa_método\`, \`é_medido_por\`

## FORMATO DE SAÍDA
Responda **estritamente em um único bloco de código JSON**, sem texto adicional. A estrutura deve ser a seguinte:

\`\`\`json
{
  "title": "Um Título Conciso e Descritivo para o Grafo",
  "nodes": [
    {
      "id": "main",
      "label": "Tópico Central do Texto",
      "type": "mainConcept",
      "source_quote": "A sentença do texto que introduz o tópico central..."
    }
  ],
  "edges": [
  ]
}
\`\`\`

---

Artigo:

{TEXTO_DE_ENTRADA}`
  },
];


export const NODE_WIDTH = 200;

export const NODE_TYPE_COLORS: { [key: string]: string } = {
  // Original types from triplet prompt
  drug: 'bg-blue-600 border-blue-400',
  population: 'bg-green-600 border-green-400',
  statistic: 'bg-yellow-600 border-yellow-400',
  mainConcept: 'bg-purple-600 border-purple-400',
  detail: 'bg-gray-600 border-gray-400',
  diagnostic: 'bg-indigo-600 border-indigo-400',
  comparison: 'bg-pink-600 border-pink-400',
  insight: 'bg-teal-600 border-teal-400',
  treatment: 'bg-red-600 border-red-400',
  comorbidity: 'bg-orange-600 border-orange-400',
  mechanism: 'bg-cyan-600 border-cyan-400',
  riskFactor: 'bg-rose-700 border-rose-500',
  
  // Types from original primary prompt (some overlap, some new)
  category: 'bg-fuchsia-700 border-fuchsia-500',
  target: 'bg-sky-700 border-sky-500',
  evidence: 'bg-emerald-700 border-emerald-500',
  challenge: 'bg-amber-700 border-amber-500',
  drugClass: 'bg-violet-700 border-violet-500',

  // New types from "PROMPT MESTRE" (v5.0)
  keyConcept: 'bg-lime-600 border-lime-400',
  process: 'bg-sky-600 border-sky-400',
  property: 'bg-indigo-500 border-indigo-300',
  method: 'bg-amber-500 border-amber-300',
  finding: 'bg-emerald-500 border-emerald-300',
  implication: 'bg-rose-500 border-rose-300',
  example: 'bg-stone-500 border-stone-400',

  // Types from Knowledge Base format
  Fundamental: 'bg-red-700 border-red-500',
  Importante: 'bg-yellow-600 border-yellow-400',
  Especializado: 'bg-blue-600 border-blue-400',
  
  // Default fallback
  default: 'bg-slate-700 border-slate-500',
};

export const DEFAULT_JSON_DATA = `{
  "triplets": [
    {
      "s": {
        "label": "digoxin",
        "type": "drug"
      },
      "p": "reduced the risk of",
      "o": {
        "label": "30-day all-cause hospitalization",
        "type": "statistic"
      }
    },
    {
      "s": {
        "label": "digoxin",
        "type": "drug"
      },
      "p": "has not been studied in",
      "o": {
        "label": "older diastolic heart failure patients",
        "type": "population"
      }
    },
    {
      "s": {
        "label": "988 patients with chronic heart failure and preserved (>45%) ejection fraction",
        "type": "population"
      },
      "p": "included",
      "o": {
        "label": "631 patients \\u226565 years",
        "type": "population"
      }
    },
    {
      "s": {
        "label": "631 patients \\u226565 years",
        "type": "population"
      },
      "p": "included",
      "o": {
        "label": "311 received digoxin",
        "type": "population"
      }
    },
    {
      "s": {
        "label": "All-cause hospitalization 30-day post-randomization",
        "type": "statistic"
      },
      "p": "occurred in",
      "o": {
        "label": "4% of patients in the placebo group",
        "type": "statistic"
      }
    },
    {
      "s": {
        "label": "heart failure",
        "type": "mainConcept"
      },
      "p": "is the leading cause for",
      "o": {
        "label": "hospital readmission for older Medicare beneficiaries",
        "type": "statistic"
      }
    }
  ]
}`;

export const LAYOUTS = {
  TB: 'layoutTB',
  BT: 'layoutBT',
  LR: 'layoutLR',
  RL: 'layoutRL',
  LR_CURVED: 'layoutLR_CURVED',
};

// Fix: Updated model name to 'gemini-flash-lite-latest' to align with current Gemini API guidelines.
export const GEMINI_MODELS = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-flash-lite-latest'];