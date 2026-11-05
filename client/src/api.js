import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || localStorage.getItem('parent_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur de RÉPONSE (Surveille les erreurs 401)
api.interceptors.response.use(
  (response) => response, // Si tout va bien, on renvoie la réponse
  (error) => {
    // Si le serveur répond 401 (Non autorisé / Token expiré)
    if (error.response && error.response.status === 401) {
      // On tire la sonnette d'alarme pour réveiller le SessionGuard !
      window.dispatchEvent(new Event('session-expired'));
    }
    return Promise.reject(error);
  }
);

export default api;