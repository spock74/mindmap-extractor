
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
