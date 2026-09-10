import logger from "../config/logger.js";

const exports = {};

/**
 * Feature 1 ships an authenticated empty collection so session tests can
 * prove GET /todo/lists is user-scoped. List CRUD is Feature 2.
 */
exports.findAll = async (req, res) => {
  try {
    return res.send([]);
  } catch (err) {
    logger.error(`List findAll failed: ${err.message}`);
    return res.status(500).send({ message: "Unable to load lists." });
  }
};

export default exports;
