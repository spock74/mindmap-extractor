
export interface S_O_Node {
  label: string;
  type: string;
}

export interface Triplet {
  s: S_O_Node;
  p: string;
  o: S_O_Node | null;
}

export interface JsonData {
  triplets: Triplet[];
}

export interface HistoryItem {
  id: string;
  filename: string;
  prompt: string;
  jsonString: string;
  timestamp: string;
}