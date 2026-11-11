import api from './api';

const d = (p) => p.then((r) => r.data);

export const authApi = {
  me: () => d(api.get('/auth/me')),
  login: (body) => d(api.post('/auth/login', body)),
  register: (body) => d(api.post('/auth/register', body)),
  logout: () => d(api.post('/auth/logout')),
};

export const teacherApi = {
  dashboard: () => d(api.get('/teacher/dashboard')),
  analytics: () => d(api.get('/teacher/analytics')),
  difficult: (params) => d(api.get('/teacher/difficult-questions', { params })),
  exams: (params) => d(api.get('/teacher/exams', { params })),
  exam: (id) => d(api.get(`/teacher/exams/${id}`)),
  createExam: (body) => d(api.post('/teacher/exams', body)),
  updateExam: (id, body) => d(api.put(`/teacher/exams/${id}`, body)),
  deleteExam: (id) => d(api.delete(`/teacher/exams/${id}`)),
  setStatus: (id, status) => d(api.patch(`/teacher/exams/${id}/status`, { status })),
  releaseExam: (id, released) => d(api.patch(`/teacher/exams/${id}/release-results`, { released })),
  attempts: (id, params) => d(api.get(`/teacher/exams/${id}/attempts`, { params })),
  attempt: (id) => d(api.get(`/teacher/attempts/${id}`)),
  releaseAttempt: (id, released) => d(api.patch(`/teacher/attempts/${id}/release`, { released })),
  students: (params) => d(api.get('/teacher/students', { params })),
};

export const candidateApi = {
  dashboard: () => d(api.get('/candidate/dashboard')),
  exams: (params) => d(api.get('/candidate/exams', { params })),
  exam: (id) => d(api.get(`/candidate/exams/${id}`)),
  start: (id) => d(api.post(`/candidate/exams/${id}/start`)),
  attempt: (id) => d(api.get(`/candidate/attempts/${id}`)),
  saveAnswers: (id, answers) => d(api.put(`/candidate/attempts/${id}/answers`, { answers })),
  submit: (id, answers) => d(api.post(`/candidate/attempts/${id}/submit`, answers ? { answers } : {})),
  results: (params) => d(api.get('/candidate/results', { params })),
  result: (id) => d(api.get(`/candidate/results/${id}`)),
};
