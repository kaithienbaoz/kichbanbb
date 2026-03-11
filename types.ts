
export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Spoiler {
  id: string;
  title: string;
  content: string;
  sources?: GroundingSource[];
}

export interface LongArticleResult {
  english: string;
  vietnamese: string;
}

export interface GenerationState {
  isLoading: boolean;
  error: string | null;
  data: Spoiler[];
}

export interface CharacterKnowledge {
  name: string;
  past: string;
  relationships: string;
  status: string;
  currentPlot: string;
  lastUpdated: string;
}

export interface PastPlot {
  id: string;
  content: string;
  date: string;
}

export interface TimelineEntry {
  id: string;
  fedDate: string;
  contentTitle: string;
  content: string;
}

export interface BrainActiveData {
  characters: CharacterKnowledge[];
  generalPlot: string;
  pastPlots: PastPlot[];
  timeline: TimelineEntry[];
  lastGlobalUpdate: string;
  perplexityTemplate: string;
  customPromptTemplate: string;
  articlePromptTemplate: string;
  backupLink1?: string;
  backupLink2?: string;
}
