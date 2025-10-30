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