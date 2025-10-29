


export interface S_O_Node {
  label: string;
  // Fix: Made 'type' optional to resolve a TypeScript error. The compiler
  // indicated that the type inferred from the Zod schema treated 'type' as
  // optional, while this interface required it, causing a mismatch. The
  // application code already handles this by providing a default.
  type?: string;
}

export interface Triplet {
  s: S_O_Node;
  p: string;
  // Fix: Made 'o' optional to resolve a TypeScript error. The compiler
  // indicated that the type inferred from the Zod schema treated 'o' as
  // optional, while this interface required it, causing a mismatch.
  o?: S_O_Node | null;
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