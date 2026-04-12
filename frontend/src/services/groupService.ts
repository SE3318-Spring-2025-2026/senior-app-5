import axios from 'axios';


const API_URL = 'http://localhost:8080/api/groups';

export const getSowValidationStatus = async (groupId: string) => {
  try {
    const response = await axios.get(`${API_URL}/${groupId}/validate-statement-of-work`);
    return response.data; 
  } catch (error) {
    console.error("Error fetching SOW status:", error);
    throw error;
  }
};