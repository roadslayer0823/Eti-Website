export type World = 'The Wayside Inn' | 'The Borderland Ruin' | 'The Whispering Hallow';
export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type Goal = 'Defeat your Enemy' | 'Open Survival';

export interface Stats {
  hp: number;
  skill: number;
  special: number;
  hunger: number;
  weight: number;
  maxWeight: number;
  alignment: number;
  int: number;
  str: number;
  lumes: number;
  silver: number;
}

export interface GameState {
  phase: 'INITIALIZATION' | 'ADVENTURE' | 'GAME_OVER';
  playerName: string;
  gender: string;
  race: string;
  occupation: string;
  world: World;
  difficulty: Difficulty;
  goal: Goal;
  stats: Stats;
  weapon: string;
  companion: string;
  skillName: string;
  specialName: string;
  history: string[];
  currentStory: string;
  currentImagePrompt: string;
  vocabulary: { word: string; translation: string; example: string; exampleTranslation: string }[];
  grammar: { structure: string; explanation: string; example: string } | null;
  choices: { text: string; action: string; requirement?: string }[];
  loading: boolean;
  error?: string;
}
