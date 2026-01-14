export interface ImageFile {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: number;
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