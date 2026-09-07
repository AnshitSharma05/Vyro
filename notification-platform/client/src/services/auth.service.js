import { apiClient } from '../api/client';

export const authService = {
  async login(email, password) {
    const res = await apiClient.post('/auth/login', { email, password });
    if (res.data?.data?.token) {
      localStorage.setItem('vyro_token', res.data.data.token);
      localStorage.setItem('vyro_user', JSON.stringify(res.data.data.user));
    }
    return res.data?.data;
  },

  async getCurrentUser() {
    const res = await apiClient.get('/auth/me');
    return res.data?.data;
  },

  async getOrganizations() {
    const res = await apiClient.get('/organizations');
    return res.data?.data?.organizations || res.data?.data || [];
  },

  async getProjects(organizationId) {
    const res = await apiClient.get(`/organizations/${organizationId}/projects`);
    return res.data?.data?.projects || res.data?.data || [];
  },

  async ensureSession() {
    try {
      const token = localStorage.getItem('vyro_token');
      if (token) {
        const user = await this.getCurrentUser();
        const orgs = await this.getOrganizations();
        let currentOrg = orgs[0] || null;
        let projects = [];
        if (currentOrg) {
          projects = await this.getProjects(currentOrg.id);
        }
        return {
          user,
          organizations: orgs,
          currentOrg,
          projects,
          currentProject: projects[0] || null,
        };
      }
    } catch (e) {
      console.warn('Session verification failed, attempting auto-login:', e.message);
      localStorage.removeItem('vyro_token');
    }

    // Auto-login fallback with demo developer credentials
    try {
      const loginData = await this.login('demo@example.com', 'Password123!');
      const orgs = await this.getOrganizations();
      let currentOrg = orgs[0] || null;
      let projects = [];
      if (currentOrg) {
        projects = await this.getProjects(currentOrg.id);
      }
      return {
        user: loginData.user,
        organizations: orgs,
        currentOrg,
        projects,
        currentProject: projects[0] || null,
      };
    } catch (err) {
      console.error('Failed to initialize session:', err);
      return {
        user: null,
        organizations: [],
        currentOrg: null,
        projects: [],
        currentProject: null,
      };
    }
  },

  logout() {
    localStorage.removeItem('vyro_token');
    localStorage.removeItem('vyro_user');
  }
};
