import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import DocumentsPage from './DocumentsPage';
import apiClient from '../utils/apiClient';
import apiConfig from '../config/api';

// 1. Mock the apiClient to prevent real network requests
vi.mock('../utils/apiClient');

// 2. Mock useNavigate from react-router-dom to track button clicks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('DocumentsPage Component', () => {
  
  beforeEach(() => {
    // Clear all mocks and localStorage before each test for a clean slate
    vi.clearAllMocks();
    localStorage.clear();
  });

  // Helper function to simulate a logged-in student in localStorage
  const setupStudentUser = () => {
    const user = { role: 'Student', teamId: 'group-123' };
    localStorage.setItem('user', JSON.stringify(user));
  };

  it('should display loading state initially', () => {
    setupStudentUser();
    // Return a promise that never resolves to keep the component in loading state
    apiClient.get.mockReturnValue(new Promise(() => {}));

    render(
      <BrowserRouter>
        <DocumentsPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Loading documents.../i)).toBeTruthy();
  });

  it('should render submissions table when data is fetched successfully', async () => {
    setupStudentUser();
    const mockData = [
      { 
        _id: 'sub1', 
        title: 'Project Proposal', 
        type: 'SOW', 
        status: 'Approved', 
        submittedAt: '2026-04-21T10:00:00Z' 
      }
    ];

    apiClient.get.mockResolvedValueOnce({ data: mockData });

    render(
      <BrowserRouter>
        <DocumentsPage />
      </BrowserRouter>
    );

    // Wait for the data to be rendered in the document
    await waitFor(() => {
      expect(screen.getByText('Project Proposal')).toBeTruthy();
    });

    expect(screen.getByText('SOW')).toBeTruthy();
    expect(screen.getByText('Approved')).toBeTruthy();
    
    // Check if the API was called with the correct query parameter
    expect(apiClient.get).toHaveBeenCalledWith(apiConfig.endpoints.submissions.byGroup('group-123'));
  });

  it('should show an error message if the user session is missing', async () => {
    // We do NOT call setupStudentUser() here to simulate a missing session
    render(
      <BrowserRouter>
        <DocumentsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/User session not found/i)).toBeTruthy();
    });
  });

  it('should show "No submissions found" when the API returns an empty list', async () => {
    setupStudentUser();
    apiClient.get.mockResolvedValueOnce({ data: [] });

    render(
      <BrowserRouter>
        <DocumentsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No submissions found/i)).toBeTruthy();
    });
  });

  it('should show a friendly error when a student has no group assigned', async () => {
    localStorage.setItem('user', JSON.stringify({ role: 'Student' }));

    render(
      <BrowserRouter>
        <DocumentsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/You are not assigned to any group yet/i)).toBeTruthy();
    });

    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('should navigate to details page when "View Details" is clicked', async () => {
    setupStudentUser();
    const mockData = [{ _id: 'sub123', title: 'Test Doc', status: 'Pending' }];
    apiClient.get.mockResolvedValueOnce({ data: mockData });

    render(
      <BrowserRouter>
        <DocumentsPage />
      </BrowserRouter>
    );

    // Find the button and click it
    const viewBtn = await screen.findByText(/View Details/i);
    fireEvent.click(viewBtn);

    // Verify navigate was called with correct ID
    expect(mockNavigate).toHaveBeenCalledWith('/documents/sub123');
  });

  it('should display error message on API failure', async () => {
    setupStudentUser();
    // Simulate a 500 Server Error
    apiClient.get.mockRejectedValueOnce({
      response: { data: { message: 'Server Error' } }
    });

    render(
      <BrowserRouter>
        <DocumentsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Server Error')).toBeTruthy();
    });
  });
});
