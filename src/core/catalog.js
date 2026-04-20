const { CATALOG_FILE } = require("./constants");
const { readJsonIfExists } = require("./fs");

function loadCatalog() {
  const catalog = readJsonIfExists(CATALOG_FILE);
  if (!catalog) {
    return { skills: {}, agents: {}, mcps: {}, modules: {} };
  }

  return catalog;
}

function getCapability(catalog, type, name) {
  const collectionName = `${type}s`;
  const collection = catalog[collectionName];
  if (!collection) {
    return null;
  }

  return collection[name] || null;
}

module.exports = {
  getCapability,
  loadCatalog,
};
