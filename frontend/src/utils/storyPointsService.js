import apiClient from './apiClient';
import apiConfig from '../config/api';

const resolveErrorMessage = (error, fallback) => {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) {
    return message.join(', ');
  }
  return message || error?.message || fallback;
};

const mapStoryPointError = (error, fallback) => {
  const status = error?.response?.status;
  if (status === 403) {
    return 'Bu işlem için yetkiniz yok.';
  }
  if (status === 422) {
    return 'Sprint yapılandırılmamış. Lütfen önce sprint ayarlarını tamamlayın.';
  }
  if (status === 502) {
    return 'JIRA/GitHub servisi şu anda kullanılamıyor. Lütfen tekrar deneyin.';
  }
  return resolveErrorMessage(error, fallback);
};

const getStoryPoints = async (groupId, sprintId) => {
  try {
    const response = await apiClient.get(apiConfig.endpoints.storyPoints(groupId, sprintId));
    return response.data;
  } catch (error) {
    throw new Error(mapStoryPointError(error, 'Story point kayıtları alınamadı.'));
  }
};

const fetchAndVerifyStoryPoints = async (groupId, sprintId, studentIds = []) => {
  try {
    const payload = studentIds.length ? { studentIds } : {};
    const response = await apiClient.post(
      apiConfig.endpoints.storyPoints(groupId, sprintId),
      payload,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      mapStoryPointError(error, 'Story point verileri alınırken bir hata oluştu.'),
    );
  }
};

const overrideStoryPoints = async (groupId, sprintId, studentId, completedPoints) => {
  try {
    const response = await apiClient.patch(
      apiConfig.endpoints.overrideStoryPoints(groupId, sprintId),
      { studentId, completedPoints },
    );
    return response.data;
  } catch (error) {
    throw new Error(
      mapStoryPointError(error, 'Story point override işlemi başarısız oldu.'),
    );
  }
};

const storyPointsService = {
  getStoryPoints,
  fetchAndVerifyStoryPoints,
  overrideStoryPoints,
};

export default storyPointsService;
