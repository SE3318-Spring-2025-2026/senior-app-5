import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SubmissionDetailsPage from './SubmissionDetailsPage';
import apiClient from '../utils/apiClient';


vi.mock('../utils/apiClient');

describe('SubmissionDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter initialEntries={['/documents/123']}>
        <Routes>
          <Route path="/documents/:id" element={<SubmissionDetailsPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('should render error message when user is not logged in (Auth Check)', () => {
    renderComponent();
    expect(screen.getByText(/You must be logged in to view this page/i)).toBeTruthy();
  });

  it('should render loading state initially', () => {
    localStorage.setItem('user', JSON.stringify({ role: 'Student' }));
    apiClient.get.mockImplementation(() => new Promise(() => {})); 
    
    renderComponent();
    expect(screen.getByText(/Loading details/i)).toBeTruthy();
  });

  it('should render submission fields on successful fetch', async () => {
    localStorage.setItem('user', JSON.stringify({ role: 'Student' }));
    const mockData = { 
      _id: '123', title: 'Senior Project Final Report', status: 'Approved', 
      type: 'PDF', groupId: 'group-42', submittedAt: '2026-05-15T10:00:00.000Z',
      documents: [{ originalName: 'report.pdf', uploadedAt: '2026-05-15T10:00:00.000Z' }] 
    };
    apiClient.get.mockResolvedValue({ data: mockData });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Viewing details for: Senior Project Final Report/i)).toBeTruthy();
      expect(screen.getByText('Approved')).toBeTruthy();
      expect(screen.getByText('group-42')).toBeTruthy();
      expect(screen.getByText(/report\.pdf/i)).toBeTruthy();
    });
  });

  it('should render error message and "Go to Login" button on API failure', async () => {
    localStorage.setItem('user', JSON.stringify({ role: 'Student' }));
    apiClient.get.mockRejectedValue(new Error('Network Error'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Failed to load submission details/i)).toBeTruthy();
      expect(screen.getByText(/Go to Login/i)).toBeTruthy();
    });
  });

  it('should render "No files uploaded" message when documents array is empty', async () => {
    localStorage.setItem('user', JSON.stringify({ role: 'Student' }));
    const mockData = { _id: '123', title: 'Empty Submission', documents: [] };
    apiClient.get.mockResolvedValue({ data: mockData });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/No files have been uploaded yet/i)).toBeTruthy();
    });
  });
});