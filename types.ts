



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

export interface TripletJsonData {
  triplets: Triplet[];
}

// New types for Knowledge Base
export interface RelatedConcept {
  typ: 'prerequisite' | 'co-requisite' | 'application';
  c_id: string;
}

export interface KnowledgeNugget {
  nug: string;
  s_quo: string;
}

export interface KnowledgeBaseConcept {
  c_id: string;
  s_doc: string;
  c_con: string;
  k_nug: KnowledgeNugget[];
  p_misc: string[];
  b_lvl: string[];
  c_cplx: 'Baixa' | 'Média' | 'Alta';
  c_rel: 'Fundamental' | 'Importante' | 'Especializado';
  k_stab: 'Estável' | 'Emergente';
  r_con: RelatedConcept[];
  m_prmpt: string[];
}

export interface KnowledgeBaseJsonData {
  kb: KnowledgeBaseConcept[];
}


export interface HistoryItem {
  id: string;
  filename: string;
  prompt: string;
  jsonString: string;
  timestamp: string;
}