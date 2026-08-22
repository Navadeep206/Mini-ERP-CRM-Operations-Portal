import { requestHelper } from './api';

export const aiService = {
  askAssistant: async (question) => {
    return requestHelper('/api/ai/query', 'POST', { question });
  }
};
