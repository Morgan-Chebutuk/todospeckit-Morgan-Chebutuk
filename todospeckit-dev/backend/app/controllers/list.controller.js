import db from "../models/index.js";
import logger from "../config/logger.js";
import { getAccessibleListOrNull } from "../authorization/authorization.js";

const LIST_NAME_MAX = 100;

const parseListId = (value) => {
  const id = parseInt(value, 10);
  return Number.isNaN(id) ? null : id;
};

const validateListName = (name) => {
  if (typeof name !== "string" || !name.trim()) {
    return "List name is required.";
  }

  if (name.trim().length > LIST_NAME_MAX) {
    return "List name must be 100 characters or fewer.";
  }

  return null;
};

const exports = {};

exports.findAll = async (req, res) => {
  try {
    const lists = await db.list.findAll({
      where: { userId: req.user.id },
      order: [["name", "ASC"]],
    });

    return res.send(lists);
  } catch (err) {
    logger.error(`List findAll failed: ${err.message}`);
    return res.status(500).send({ message: "Unable to load lists." });
  }
};

exports.create = async (req, res) => {
  try {
    const nameError = validateListName(req.body?.name);
    if (nameError) {
      return res.status(400).send({ message: nameError });
    }

    const list = await db.list.create({
      name: req.body.name.trim(),
      userId: req.user.id,
    });

    return res.status(201).send(list);
  } catch (err) {
    logger.error(`List create failed: ${err.message}`);
    return res.status(500).send({ message: "Unable to create list." });
  }
};

exports.update = async (req, res) => {
  try {
    const listId = parseListId(req.params.listId);
    if (listId === null) {
      return res.status(400).send({ message: "List id is invalid." });
    }

    const nameError = validateListName(req.body?.name);
    if (nameError) {
      return res.status(400).send({ message: nameError });
    }

    const list = await getAccessibleListOrNull(req, listId);
    if (!list) {
      return res.status(404).send({ message: `List with id=${listId} not found.` });
    }

    list.name = req.body.name.trim();
    await list.save();

    return res.send(list);
  } catch (err) {
    logger.error(`List update failed: ${err.message}`);
    return res.status(500).send({ message: "Unable to update list." });
  }
};

exports.remove = async (req, res) => {
  try {
    const listId = parseListId(req.params.listId);
    if (listId === null) {
      return res.status(400).send({ message: "List id is invalid." });
    }

    const list = await getAccessibleListOrNull(req, listId);
    if (!list) {
      return res.status(404).send({ message: `List with id=${listId} not found.` });
    }

    await list.destroy();
    return res.send({ message: "List deleted successfully." });
  } catch (err) {
    logger.error(`List delete failed: ${err.message}`);
    return res.status(500).send({ message: "Unable to delete list." });
  }
};

export default exports;
