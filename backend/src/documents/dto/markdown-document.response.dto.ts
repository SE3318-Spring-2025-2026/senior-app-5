export interface MarkdownSectionResponse {
  sectionId: string;
  heading: string;
  level: number;
  order: number;
  slug: string;
}

export interface MarkdownDocumentResponse {
  documentId: string;
  title: string;
  submissionId: string;
  groupId: string;
  contentMarkdown: string;
  sections: MarkdownSectionResponse[];
  createdAt: Date;
  updatedAt: Date;
}
