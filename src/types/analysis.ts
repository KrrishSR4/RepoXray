export interface RepoMeta {
  owner: string;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  default_branch: string;
  language: string | null;
  stars: number;
  forks: number;
  topics: string[];
}

export interface TreeEntry {
  path: string;
  type: "blob" | "tree" | string;
  size?: number;
}

export interface StructureNote {
  path: string;
  note: string;
}

export interface ImportantFile {
  path: string;
  purpose: string;
  explanation_md: string;
}

export interface Explanation {
  tagline: string;
  overview_md: string;
  complexity: "Beginner" | "Intermediate" | "Advanced";
  key_concepts: string[];
  tech_stack: string[];
  structure_notes: StructureNote[];
  important_files: ImportantFile[];
  start_here_md: string;
}

export interface AnalysisResult {
  repo: RepoMeta;
  tree: TreeEntry[];
  readme_raw: string;
  explanation: Explanation;
}
