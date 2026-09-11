import db from "../models/index.js";
import logger from "../config/logger.js";
import { getAccessibleListOrNull, getAccessibleTodoOrNull } from "../authorization/authorization.js";

const TODO_TITLE_MAX = 255;
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DUE_DATE_ERROR = "Due date must be a valid date in YYYY-MM-DD format.";

const parseId = (value) => {
  const id = parseInt(value, 10);
  return Number.isNaN(id) ? null : id;
};

const isValidDueDate = (value) => {
  if (typeof value !== "string" || !DATE_ONLY_REGEX.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

const parseDueDateForWrite = (dueDate) => {
  if (dueDate === null) {
    return { value: null };
  }

  if (!isValidDueDate(dueDate)) {
    return { error: DUE_DATE_ERROR };
  }

  return { value: dueDate };
};

const validateTodoTitle = (title) => {
  if (typeof title !== "string" || !title.trim()) {
    return "Todo title is required.";
  }

  if (title.trim().length > TODO_TITLE_MAX) {
    return "Todo title must be 255 characters or fewer.";
  }

  return null;
};

const exports = {};

exports.findAll = async (req, res) => {
  try {
    const listId = parseId(req.params.listId);
    if (listId === null) {
      return res.status(400).send({ message: "List id is invalid." });
    }

    const list = await getAccessibleListOrNull(req, listId);
    if (!list) {
      return res.status(404).send({ message: `List with id=${listId} not found.` });
    }

    const todos = await db.todo.findAll({
      where: { listId, userId: req.user.id },
      order: [
        ["completed", "ASC"],
        ["createdAt", "ASC"],
      ],
    });

    return res.send(todos);
  } catch (err) {
    logger.error(`Todo findAll failed: ${err.message}`);
    return res.status(500).send({ message: "Unable to load todos." });
  }
};

exports.create = async (req, res) => {
  try {
    const listId = parseId(req.params.listId);
    if (listId === null) {
      return res.status(400).send({ message: "List id is invalid." });
    }

    const list = await getAccessibleListOrNull(req, listId);
    if (!list) {
      return res.status(404).send({ message: `List with id=${listId} not found.` });
    }

    const titleError = validateTodoTitle(req.body?.title);
    if (titleError) {
      return res.status(400).send({ message: titleError });
    }

    let dueDate = null;
    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "dueDate") && req.body.dueDate !== undefined) {
      const parsedDueDate = parseDueDateForWrite(req.body.dueDate);
      if (parsedDueDate.error) {
        return res.status(400).send({ message: parsedDueDate.error });
      }

      dueDate = parsedDueDate.value;
    }

    const todo = await db.todo.create({
      title: req.body.title.trim(),
      listId: list.id,
      userId: req.user.id,
      completed: false,
      dueDate,
    });

    return res.status(201).send(todo);
  } catch (err) {
    logger.error(`Todo create failed: ${err.message}`);
    return res.status(500).send({ message: "Unable to create todo." });
  }
};

exports.update = async (req, res) => {
  try {
    const todoId = parseId(req.params.id);
    if (todoId === null) {
      return res.status(400).send({ message: "Todo id is invalid." });
    }

    const todo = await getAccessibleTodoOrNull(req, todoId);
    if (!todo) {
      return res.status(404).send({ message: `Todo with id=${todoId} not found.` });
    }

    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "title")) {
      const titleError = validateTodoTitle(req.body.title);
      if (titleError) {
        return res.status(400).send({ message: titleError });
      }

      todo.title = req.body.title.trim();
    }

    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "completed")) {
      todo.completed = Boolean(req.body.completed);
    }

    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "dueDate")) {
      const parsedDueDate = parseDueDateForWrite(req.body.dueDate);
      if (parsedDueDate.error) {
        return res.status(400).send({ message: parsedDueDate.error });
      }

      todo.dueDate = parsedDueDate.value;
    }

    await todo.save();
    return res.send(todo);
  } catch (err) {
    logger.error(`Todo update failed: ${err.message}`);
    return res.status(500).send({ message: "Unable to update todo." });
  }
};

exports.remove = async (req, res) => {
  try {
    const todoId = parseId(req.params.id);
    if (todoId === null) {
      return res.status(400).send({ message: "Todo id is invalid." });
    }

    const todo = await getAccessibleTodoOrNull(req, todoId);
    if (!todo) {
      return res.status(404).send({ message: `Todo with id=${todoId} not found.` });
    }

    await todo.destroy();
    return res.send({ message: "Todo deleted successfully." });
  } catch (err) {
    logger.error(`Todo delete failed: ${err.message}`);
    return res.status(500).send({ message: "Unable to delete todo." });
  }
};

export default exports;
