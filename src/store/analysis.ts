import { create } from "zustand";
import type { AnalysisResult } from "@/types/analysis";

interface AnalysisState {
  result: AnalysisResult | null;
  loadingStage: number; // 0..3
  error: string | null;
  setResult: (r: AnalysisResult | null) => void;
  setLoadingStage: (n: number) => void;
  setError: (e: string | null) => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  result: null,
  loadingStage: 0,
  error: null,
  setResult: (result) => set({ result }),
  setLoadingStage: (loadingStage) => set({ loadingStage }),
  setError: (error) => set({ error }),
}));
