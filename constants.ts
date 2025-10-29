

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 60;

export const NODE_TYPE_COLORS: { [key: string]: string } = {
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

export const DEFAULT_GEMINI_PROMPT = `Você é um especialista em **Análise Crítica de Artigos Científicos** e Engenharia de Conhecimento, focado em NLP Biomédico.

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

1.  **FOCO NOS ACHADOS (FINDINGS):** Dê prioridade máxima aos fatos extraídos das seções de **Resultados (Results)**, **Discussão (Discussion)** e **Conclusões (Conclusions)** do texto.
2.  **TRATAMENTO DE CONTEXTO (BACKGROUND):** Fatos da **Introdução (Introduction)** ou **Background** só devem ser extraídos se forem definições gerais (ex: "ICFEp é...") ou fatos de conhecimento comum que *contextualizam* o estudo.
3.  **REGRA DE CONTRADIÇÃO (A MAIS IMPORTANTE):** Se o Background mencionar um fato sobre um grupo (ex: "Droga X reduz risco em *Pacientes A*") e os Resultados/Conclusão do estudo atual encontrarem o oposto para o seu grupo de estudo (ex: "Droga X *aumenta* o risco em *Pacientes B*"), **VOCÊ DEVE PRIORIZAR E EXTRAIR O ACHADO DO ESTUDO ATUAL** (o aumento do risco no Paciente B) e **IGNORAR** o fato do background.

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

* **Texto (Background):** "Estudos anteriores mostraram que a *Droga A* melhora a sobrevida na *População X*."
* **Texto (Resultados):** "No nosso estudo, a *Droga A* **não** melhorou a sobrevida na *População Y* (HR 1.05)."
* **Extração Correta (Ignora o Background):**
    \`\`\`json
    {
      "s": { "label": "Droga A", "type": "drug" },
      "p": "não melhorou",
      "o": { "label": "sobrevida na População Y (HR 1.05)", "type": "insight" }
    }
    \`\`\`

* **Texto (Resultados):** "(E/E' >15 sugere aumento das pressões de enchimento)."
* **Extração Correta:**
    \`\`\`json
    {
      "s": { "label": "E/E' > 15", "type": "diagnostic" },
      "p": "sugere",
      "o": { "label": "aumento das pressões de enchimento", "type": "insight" }
    }
    \`\`\`
`;

export const GEMINI_MODELS = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];