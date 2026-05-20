export type CardType = 'content_block' | 'exercise' | 'mc_quiz' | 'long_question' | 'notes';

export type ProjectType = 'lesson_plan' | 'handout' | 'student_notes';

export interface ReferenceFile {
  name: string;
  content: string; // base64 encoded
  type: string;
}

export interface ReferenceData {
  files: (ReferenceFile | null)[];
  pastedText: string;
}

export interface Project {
  id: string;
  name: string;
  subject: string;
  grade: string;
  type: ProjectType;
  createdAt: number;
  negativePrompt?: string;
  references?: ReferenceData;
}

export interface Card {
  id: string;
  title: string;
  type: CardType;
  content: string;
  suggestions: string[];
  status: 'draft' | 'active' | 'saved';
  teacherNotes?: string[];
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  displayContent?: string;
}
