import axios from 'axios';


const API_URL = 'http://localhost:8080/api/phases'; 

export const updatePhaseSchedule = async (phaseId: string, startDate: string, endDate: string) => {
  try {
    
    const response = await axios.put(`${API_URL}/${phaseId}/schedule`, {
      startDate, 
      endDate
    });
    return response.data;
  } catch (error) {
    console.error("Error updating phase schedule:", error);
    throw error;
  }
};