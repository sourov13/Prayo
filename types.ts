export enum AppTab {
  Morning = 'MORNING',
  Night = 'NIGHT',
  Relationships = 'RELATIONSHIPS',
  Saved = 'SAVED',
  Calendar = 'CALENDAR'
}

export interface GeneratedContent {
  id: string;
  text: string;
  type: AppTab;
  timestamp: number;
  theme?: string;
  isSaved?: boolean;
}

export interface GenerationConfig {
  type: AppTab;
  theme?: string;
}