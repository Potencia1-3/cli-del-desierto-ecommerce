import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Clients
export const getClients = (search = '') => 
  axios.get(`${API}/clients${search ? `?search=${search}` : ''}`);

export const getClient = (id) => 
  axios.get(`${API}/clients/${id}`);

export const createClient = (data) => 
  axios.post(`${API}/clients`, data);

export const updateClient = (id, data) => 
  axios.put(`${API}/clients/${id}`, data);

export const updateMedicalHistory = (id, data) => 
  axios.put(`${API}/clients/${id}/medical`, data);

export const addMeasurement = (id, data) => 
  axios.post(`${API}/clients/${id}/measurements`, data);

// Packages
export const getPackages = (clientId = null, status = null) => {
  const params = new URLSearchParams();
  if (clientId) params.append('client_id', clientId);
  if (status) params.append('status', status);
  return axios.get(`${API}/packages?${params.toString()}`);
};

export const createPackage = (data) => 
  axios.post(`${API}/packages`, data);

export const getPackage = (id) => 
  axios.get(`${API}/packages/${id}`);

// Sessions
export const getTimeSlots = () => 
  axios.get(`${API}/sessions/time-slots`);

export const getSessions = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.append(key, value);
  });
  return axios.get(`${API}/sessions?${searchParams.toString()}`);
};

export const getCalendarSessions = (startDate, endDate) => 
  axios.get(`${API}/sessions/calendar?start_date=${startDate}&end_date=${endDate}`);

export const createSession = (data) => 
  axios.post(`${API}/sessions`, data);

export const updateSession = (id, data) => 
  axios.put(`${API}/sessions/${id}`, data);

export const completeSession = (id) => 
  axios.put(`${API}/sessions/${id}/complete`);

export const cancelSession = (id) => 
  axios.put(`${API}/sessions/${id}/cancel`);

// Sales
export const getSales = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) searchParams.append(key, value);
  });
  return axios.get(`${API}/sales?${searchParams.toString()}`);
};

export const createSale = (data) => 
  axios.post(`${API}/sales`, data);

export const getSalesSummary = (period = 'month') => 
  axios.get(`${API}/sales/summary?period=${period}`);

// Dashboard
export const getDashboardStats = () => 
  axios.get(`${API}/dashboard/stats`);

export const getTodaySchedule = () => 
  axios.get(`${API}/dashboard/today-schedule`);

// Client Portal
export const getMyInfo = () => 
  axios.get(`${API}/portal/my-info`);

export const getMyProgress = () => 
  axios.get(`${API}/portal/my-progress`);

export const getAvailableSlots = (date) => 
  axios.get(`${API}/portal/available-slots?date=${date}`);

export const registerClient = (data) => 
  axios.post(`${API}/portal/register`, data);

// Init
export const initAdmin = () => 
  axios.post(`${API}/init/admin`);
