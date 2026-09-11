import apiClient from "./services.js";

const todoServices = {
  getAll(listId) {
    return apiClient.get(`lists/${listId}/todos`);
  },

  create(listId, payload) {
    return apiClient.post(`lists/${listId}/todos`, payload);
  },

  update(todoId, payload) {
    return apiClient.put(`todos/${todoId}`, payload);
  },

  delete(todoId) {
    return apiClient.delete(`todos/${todoId}`);
  },
};

export default todoServices;
