it('should update submissionEnd minimum when submissionStart changes later', () => {
    render(<PhaseSchedulingPage />);

    const startInput = screen.getByLabelText(/Submission Start/i);
    const endInput = screen.getByLabelText(/Submission End/i);

    fireEvent.change(startInput, { target: { value: '2026-04-25T09:00' } });
    fireEvent.change(startInput, { target: { value: '2026-04-28T10:30' } });

    expect(endInput.min).toBe('2026-04-28T10:30');
  });

  it('should render updated phase JSON after a successful API call', async () => {
    apiClient.put.mockResolvedValueOnce({
      data: {
        phaseId: 'phase-123',
        submissionStart: '2026-04-25T09:00:00.000Z',
        submissionEnd: '2026-05-02T09:00:00.000Z',
      },
    });

    render(<PhaseSchedulingPage />);

    const phaseIdInput = screen.getByLabelText(/Phase ID/i);
    const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });

    fireEvent.change(phaseIdInput, { target: { value: 'phase-123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Updated Phase/i)).toBeTruthy();
      expect(screen.getByText(/"phaseId": "phase-123"/i)).toBeTruthy();
    });
  });

  it('should display a required field error when submissionEnd is missing', async () => {
    apiClient.put.mockResolvedValueOnce({ data: {} });

    render(<PhaseSchedulingPage />);

    const endInput = screen.getByLabelText(/Submission End/i);
    const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });

    fireEvent.change(endInput, { target: { value: '' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Start and end date are required/i)).toBeTruthy();
    });
  });

  it('should display a required field error when submissionStart is missing', async () => {
    apiClient.put.mockResolvedValueOnce({ data: {} });

    render(<PhaseSchedulingPage />);

    const startInput = screen.getByLabelText(/Submission Start/i);
    const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });

    fireEvent.change(startInput, { target: { value: '' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Start and end date are required/i)).toBeTruthy();
    });
  });

  it('should display a validation error when submissionEnd equals submissionStart', async () => {
    render(<PhaseSchedulingPage />);
    const startInput = screen.getByLabelText(/Submission Start/i);
    const endInput = screen.getByLabelText(/Submission End/i);
    const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });

    fireEvent.change(startInput, { target: { value: '2026-05-01T10:00' } });
    fireEvent.change(endInput, { target: { value: '2026-05-01T10:00' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/End date must be after start date/i)).toBeTruthy();
    });
  });

  it('loads and displays the selected phase schedule', async () => {
    // mockPhases tanımlı varsayılıyor (testin üst kısımlarından gelmeli)
    renderWithPhases();

    fireEvent.change(await screen.findByLabelText(/^Phase$/i), { target: { value: 'phase-123' } });

    const startInput = screen.getByLabelText(/Submission Start/i);
    const endInput = screen.getByLabelText(/Submission End/i);
    
    expect(startInput).toBeInTheDocument();
    expect(endInput).toBeInTheDocument();
  });

  it('should display a graceful error when the backend fails unexpectedly', async () => {
    apiClient.put.mockRejectedValueOnce(new Error('Internal server error'));

    render(<PhaseSchedulingPage />);

    const phaseIdInput = screen.getByLabelText(/Phase ID/i);
    const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });

    fireEvent.change(phaseIdInput, { target: { value: 'phase-123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Internal server error/i)).toBeTruthy();
    });
  });

  it('should display an invalid date error when a malformed date is entered', async () => {
    render(<PhaseSchedulingPage />);
    const startInput = screen.getByLabelText(/Submission Start/i);
    const submitButton = screen.getByRole('button', { name: /Update Phase Schedule/i });

    fireEvent.change(startInput, { target: { value: 'invalid-date-string' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Invalid date/i)).toBeTruthy();
    });
  });

  it('renders backend array validation messages cleanly', async () => {
    // mockPhases'in dosyanın başında tanımlandığı varsayılıyor
    // apiClient.get.mockResolvedValueOnce({ data: mockPhases });
    apiClient.put.mockRejectedValueOnce({
      response: { data: { message: ['submissionStart must be a valid ISO date', 'submissionEnd must be a valid ISO date'] } },
    });

    render(<PhaseSchedulingPage />);
    // Bileşen render edildikten sonra backend'den dönen hataların arayüzde doğru görünüp görünmediğini test eden logic eklenebilir.
  });
