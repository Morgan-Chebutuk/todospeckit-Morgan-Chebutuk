import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { getAccessibleUserOrNull } from "../authorization/authorization.js";

const SALT_ROUNDS = 10;

const parseId = (value) => {
  const id = parseInt(value, 10);
  return Number.isNaN(id) ? null : id;
};

const requiredTrimmed = (value, message) => {
  if (typeof value !== "string" || !value.trim()) {
    return message;
  }

  return null;
};

const exports = {};

exports.findOne = async (req, res) => {
  try {
    const userId = parseId(req.params.id);
    if (userId === null) {
      return res.status(400).send({ message: "User id is invalid." });
    }

    const user = await getAccessibleUserOrNull(req, userId);
    if (!user) {
      return res.status(404).send({ message: `User with id=${userId} not found.` });
    }

    return res.send(user);
  } catch (err) {
    logger.error(`User findOne failed: ${err.message}`);
    return res.status(500).send({ message: "Unable to load profile." });
  }
};

exports.update = async (req, res) => {
  try {
    const userId = parseId(req.params.id);
    if (userId === null) {
      return res.status(400).send({ message: "User id is invalid." });
    }

    const user = await getAccessibleUserOrNull(req, userId);
    if (!user) {
      return res.status(404).send({ message: `User with id=${userId} not found.` });
    }

    const body = req.body ?? {};

    if (Object.prototype.hasOwnProperty.call(body, "password") && body.password != null) {
      if (typeof body.password !== "string" || body.password.length < 8) {
        return res.status(400).send({ message: "Password must be at least 8 characters." });
      }
    }

    const fieldError =
      requiredTrimmed(body.fName, "First name is required.") ||
      requiredTrimmed(body.lName, "Last name is required.") ||
      requiredTrimmed(body.email, "Email is required.") ||
      requiredTrimmed(body.username, "Username is required.");

    if (fieldError) {
      return res.status(400).send({ message: fieldError });
    }

    const nextUsername = body.username.trim().toLowerCase();
    const nextEmail = body.email.trim();

    const existingUsername = await db.user.findOne({
      where: { username: nextUsername, id: { [Op.ne]: user.id } },
    });
    if (existingUsername) {
      return res.status(400).send({ message: "Username is already taken." });
    }

    const existingEmail = await db.user.findOne({
      where: { email: nextEmail, id: { [Op.ne]: user.id } },
    });
    if (existingEmail) {
      return res.status(400).send({ message: "Email is already registered." });
    }

    user.fName = body.fName.trim();
    user.lName = body.lName.trim();
    user.email = nextEmail;
    user.username = nextUsername;

    if (typeof body.password === "string" && body.password.length >= 8) {
      user.password = await bcrypt.hash(body.password, SALT_ROUNDS);
    }

    await user.save();

    const profile = await db.user.findByPk(user.id);
    return res.send(profile);
  } catch (err) {
    logger.error(`User update failed: ${err.message}`);
    return res.status(500).send({ message: "Unable to update profile." });
  }
};

export default exports;
