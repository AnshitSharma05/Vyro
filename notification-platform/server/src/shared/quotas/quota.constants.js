const METRIC_TYPES = Object.freeze({
  METERED: 'METERED',
  RESOURCE_COUNT: 'RESOURCE_COUNT',
});

const QUOTA_METRICS = Object.freeze({
  NOTIFICATIONS: 'NOTIFICATIONS',
  EVENTS: 'EVENTS',
  API_REQUESTS: 'API_REQUESTS',
  PROJECTS: 'PROJECTS',
  API_KEYS: 'API_KEYS',
  TEMPLATES: 'TEMPLATES',
  WORKFLOWS: 'WORKFLOWS',
});

const DEFAULT_PLANS = Object.freeze({
  FREE: {
    code: 'FREE',
    name: 'Free Plan',
    description: 'Entry-level plan for developers and testing',
    limits: {
      NOTIFICATIONS: 1000,
      EVENTS: 5000,
      API_REQUESTS: 10000,
      PROJECTS: 2,
      API_KEYS: 5,
      TEMPLATES: 20,
      WORKFLOWS: 5,
    },
  },
  PRO: {
    code: 'PRO',
    name: 'Pro Plan',
    description: 'For growing applications requiring multi-channel scale',
    limits: {
      NOTIFICATIONS: 25000,
      EVENTS: 100000,
      API_REQUESTS: 250000,
      PROJECTS: 10,
      API_KEYS: 25,
      TEMPLATES: 100,
      WORKFLOWS: 25,
    },
  },
  BUSINESS: {
    code: 'BUSINESS',
    name: 'Business Plan',
    description: 'High volume enterprise notification workflow capacity',
    limits: {
      NOTIFICATIONS: 100000,
      EVENTS: 500000,
      API_REQUESTS: 1000000,
      PROJECTS: 50,
      API_KEYS: 100,
      TEMPLATES: 500,
      WORKFLOWS: 100,
    },
  },
});

module.exports = {
  METRIC_TYPES,
  QUOTA_METRICS,
  DEFAULT_PLANS,
};
