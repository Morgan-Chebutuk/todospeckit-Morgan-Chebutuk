import apiClient from "./services.js";

const listServices = {
  getAll() {
    return apiClient.get("lists");
  },

  create(payload) {
    return apiClient.post("lists", payload);
  },

  update(listId, payload) {
    return apiClient.put(`lists/${listId}`, payload);
  },

  delete(listId) {
    return apiClient.delete(`lists/${listId}`);
  },
};

export default listServices;
