import apiClient from "./services.js";

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key);

const toWriteDueDate = (dueDate) => {
  if (dueDate === "" || dueDate === null) {
    return null;
  }

  return dueDate;
};

const withDueDate = (payload = {}) => {
  const body = { ...payload };

  if (!hasOwn(body, "dueDate") || body.dueDate === undefined) {
    delete body.dueDate;
    return body;
  }

  body.dueDate = toWriteDueDate(body.dueDate);
  return body;
};

const todoServices = {
  getAll(listId) {
    return apiClient.get(`lists/${listId}/todos`);
  },

  create(listId, payload) {
    return apiClient.post(`lists/${listId}/todos`, withDueDate(payload));
  },

  update(todoId, payload) {
    return apiClient.put(`todos/${todoId}`, withDueDate(payload));
  },

  delete(todoId) {
    return apiClient.delete(`todos/${todoId}`);
  },
};

export default todoServices;
