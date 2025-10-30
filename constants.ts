



export const PROMPT_TEMPLATES = [
  {
    id: 'extracao-simples-com-rastreabilidade',
    title: 'Extração Simples com Rastreabilidade (Triplets)',
    content: `Você é um especialista em **Análise Crítica de Artigos Científicos** e Engenharia do Conhecimento, com foco em PNL Biomédica. O texto de entrada que você receberá foi pré-processado: cada linha é prefixada com um número (ex: "1: ...", "2: ...").

Sua tarefa é ler o texto fornecido e extrair as **principais** relações semânticas e causais **que representam os achados e conclusões DESTE ARTIGO**.

O formato da sua saída deve ser um único array JSON de fatos.
CADA fato deve ter a estrutura:
{
  "s": { "label": "Nome da Entidade", "type": "Tipo da Entidade" },
  "p": "Relação (Predicado)",
  "o": { "label": "Nome da Entidade", "type": "Tipo da Entidade" },
  "source_quote": "A sentença exata do texto original que justifica este fato, SEM o número da linha.",
  "source_lines": "Uma string indicando os números de linha exatos de onde a citação foi extraída (ex: 'Linhas: 42-45')."
}

---
### REGRAS DE EXTRAÇÃO E PRIORIZAÇÃO

1.  **RASTREABILIDADE É OBRIGATÓRIA:** Para cada fato, você DEVE incluir \`source_quote\` (a citação exata) E \`source_lines\` (os números de linha).
2.  **FOCO NOS ACHADOS:** Dê prioridade máxima aos fatos extraídos das seções de **Resultados**, **Discussão** e **Conclusões** do texto.
3.  **REGRA DA CONTRADIÇÃO:** Se a Introdução menciona um fato ("Droga X reduz risco") e os Resultados encontram o oposto ("Droga X aumenta risco"), **PRIORIZE E EXTRAIA O ACHADO DO ESTUDO ATUAL**.

---
### Tipos de Entidade Permitidos:
- "mainConcept", "riskFactor", "comorbidity", "mechanism", "insight", "comparison", "diagnostic", "detail", "treatment", "drug", "population", "statistic"

---
### EXEMPLO DE EXTRAÇÃO:

* **Texto de Entrada:**
  ...
  85: Em nosso estudo, a Droga A não melhorou a sobrevida na População Y (HR 1.05),
  86: o que contrasta com estudos prévios em outras populações.
  ...
* **Extração Correta:**
    \`\`\`json
    {
      "s": { "label": "Droga A", "type": "drug" },
      "p": "não melhorou",
      "o": { "label": "sobrevida na População Y (HR 1.05)", "type": "insight" },
      "source_quote": "Em nosso estudo, a Droga A não melhorou a sobrevida na População Y (HR 1.05), o que contrasta com estudos prévios em outras populações.",
      "source_lines": "Linhas: 85-86"
    }
    \`\`\`
---

Artigo:

{TEXTO_DE_ENTRADA}`
  },
  {
    id: 'prompt-mestre-grafo-hierarquico',
    title: 'PROMPT MESTRE P/ GRAFO DE CONHECIMENTO (v5.0)',
    content: `Você é um Engenheiro de Ontologias e Grafos de Conhecimento. Sua missão é modelar informações complexas de textos científicos em uma estrutura de grafo JSON. O texto de entrada que você receberá foi pré-processado: cada linha é prefixada com um número (ex: "1: ...", "2: ...").

## TAREFA
Analise o artigo e modele seu conteúdo em um formato de grafo JSON, seguindo rigorosamente as regras abaixo.

### PRINCÍPIOS DE MODELAGEM DO GRAFO

1.  **Hierarquia Lógica:** Organize os nós do geral para o específico (Raiz > Categorias > Sub-temas > Detalhes).
2.  **Riqueza Semântica:** Use os \`type\`s de nós e os \`label\`s de arestas para tornar o grafo autoexplicativo.
3.  **Rastreabilidade Obrigatória:** Cada nó gerado DEVE conter:
    *   \`source_quote\`: A sentença exata do texto original que justifica sua criação (SEM o número da linha).
    *   \`source_lines\`: Uma string indicando os números de linha exatos de onde a citação foi extraída (ex: 'Linhas: 42-45').

### REGRAS DE FORMATAÇÃO PARA A SAÍDA JSON

#### **Nós (\`nodes\`)**
Cada nó deve ser um objeto com:
*   \`id\`: String única em **kebab-case**.
*   \`label\`: Texto descritivo e conciso.
*   \`type\`: Use **estritamente** um dos seguintes: \`mainConcept\`, \`category\`, \`keyConcept\`, \`process\`, \`property\`, \`method\`, \`finding\`, \`implication\`, \`example\`.
*   \`source_quote\`: **(OBRIGATÓRIO)** A sentença exata e não modificada.
*   \`source_lines\`: **(OBRIGATÓRIO)** A string com os números de linha.

#### **Arestas (\`edges\`)**
Cada aresta deve ser um objeto com: \`id\`, \`source\`, \`target\`, e um \`label\` opcional (ex: \`causa\`, \`contém\`).

## FORMATO DE SAÍDA
Responda **estritamente em um único bloco de código JSON**, sem texto adicional.

\`\`\`json
{
  "title": "Um Título Conciso e Descritivo para o Grafo",
  "nodes": [
    {
      "id": "main",
      "label": "Tópico Central do Texto",
      "type": "mainConcept",
      "source_quote": "A sentença do texto que introduz o tópico central...",
      "source_lines": "Linhas: 1-2"
    }
  ],
  "edges": []
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