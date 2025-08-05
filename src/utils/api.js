const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend.onrender.com'
  : 'http://localhost:5000';

export const apiCall = async (endpoint, data) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// Usage in your components
export const sendUserData = (userData) => apiCall('/api/userdata', userData);
export const sendMessage = (message) => apiCall('/api/chat', { message });
