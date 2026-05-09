import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MarkdownEditorPage from './MarkdownEditorPage';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';

vi.mock('../utils/apiClient');
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../components/markdown/MarkdownEditor', () => ({
  default: function MockEditor({ initialMarkdown, onChange }) {
    return (
      <textarea
        aria-label="Markdown body"
        defaultValue={initialMarkdown}
        onChange={(e) => onChange?.(e.target.value)}
      />
    );
  },
}));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/documents/:submissionId/markdown" element={<MarkdownEditorPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MarkdownEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new document on save when no documentId is in URL', async () => {
    apiClient.post.mockResolvedValueOnce({
      data: {
        documentId: 'doc-1',
        title: 'My Doc',
        contentMarkdown: '# Intro',
        sections: [
          { sectionId: 's1', heading: 'Intro', level: 1, order: 0, slug: 'intro' },
        ],
      },
    });

    renderAt('/documents/sub-1/markdown');

    fireEvent.change(screen.getByPlaceholderText(/Document title/i), {
      target: { value: 'My Doc' },
    });
    fireEvent.change(screen.getByLabelText(/Markdown body/i), {
      target: { value: '# Intro' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        apiConfig.endpoints.markdownDocuments.create,
        { submissionId: 'sub-1', title: 'My Doc', contentMarkdown: '# Intro' },
      );
    });

    expect(await screen.findByText('Intro')).toBeTruthy();
  });

  it('loads an existing document via documentId search param and renders sections', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        documentId: 'doc-2',
        title: 'Existing',
        contentMarkdown: '# A\n## B',
        sections: [
          { sectionId: 's1', heading: 'A', level: 1, order: 0, slug: 'a' },
          { sectionId: 's2', heading: 'B', level: 2, order: 1, slug: 'b' },
        ],
      },
    });

    renderAt('/documents/sub-1/markdown?documentId=doc-2');

    expect(await screen.findByDisplayValue('Existing')).toBeTruthy();
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('B')).toBeTruthy();
    expect(apiClient.get).toHaveBeenCalledWith(
      apiConfig.endpoints.markdownDocuments.get('doc-2'),
    );
  });

  it('autosaves with PUT after typing into the editor', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    apiClient.get.mockResolvedValueOnce({
      data: {
        documentId: 'doc-3',
        title: 'Auto',
        contentMarkdown: '# Old',
        sections: [{ sectionId: 's1', heading: 'Old', level: 1, order: 0, slug: 'old' }],
      },
    });
    apiClient.put.mockResolvedValueOnce({
      data: {
        documentId: 'doc-3',
        title: 'Auto',
        contentMarkdown: '# Old\n## New',
        sections: [
          { sectionId: 's1', heading: 'Old', level: 1, order: 0, slug: 'old' },
          { sectionId: 's2', heading: 'New', level: 2, order: 1, slug: 'new' },
        ],
      },
    });

    renderAt('/documents/sub-1/markdown?documentId=doc-3');
    await screen.findByDisplayValue('Auto');

    fireEvent.change(screen.getByLabelText(/Markdown body/i), {
      target: { value: '# Old\n## New' },
    });

    await act(async () => {
      vi.advanceTimersByTime(1600);
    });

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        apiConfig.endpoints.markdownDocuments.update('doc-3'),
        { contentMarkdown: '# Old\n## New' },
      );
    });

    expect(await screen.findByText('New')).toBeTruthy();
    vi.useRealTimers();
  });
});
