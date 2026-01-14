export interface ImageFile {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: number;
}

export type PageType = 'IMAGE' | 'TEXT';

export interface EditorPage {
  id: string;
  type: PageType;
  content: string; // URL for IMAGE, HTML for TEXT
  originalName?: string;
  parentId?: string; // If derived from another page
}

export enum AppState {
  LANDING = 'LANDING',
  WORKSPACE = 'WORKSPACE',
  PREVIEW = 'PREVIEW',
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  MERGING = 'MERGING',
  COMPLETE = 'COMPLETE',
}

export interface PDFConfig {
  filename: string;
  format: 'pdf' | 'docx' | 'jpg';
  paperSize: 'a4' | 'letter' | 'fit';
}