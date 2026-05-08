export interface Chapter {
  id: string;
  title: string;
  description: string;
  order: number;
  icon: string;
  paragraphs: Paragraph[];
}

export interface Paragraph {
  id: string;
  chapterId: string;
  title: string;
  order: number;
  videoUrl: string;
  transcript: string;
  infographicUrl: string;
  learningGoals: string[];
  concepts: Concept[];
  isExtra?: boolean;
}

export interface Concept {
  term: string;
  definition: string;
}

export interface Question {
  id: string;
  paragraphId: string;
  type: "multiple-choice" | "open" | "fill-in";
  difficulty: 1 | 2 | 3 | 4;
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
}
