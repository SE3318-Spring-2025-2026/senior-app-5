import apiClient from './apiClient';
import apiConfig from '../config/api';

export async function uploadSubmissionDocument(submissionId, file, onUploadProgress) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post(
    apiConfig.endpoints.submissions.uploadDocument(submissionId),
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (event) => {
        if (!event.total) return;
        const percent = Math.round((event.loaded * 100) / event.total);
        onUploadProgress?.(percent);
      },
    }
  );

  return response.data;
}