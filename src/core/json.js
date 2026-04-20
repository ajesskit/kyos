function stableStringify(value) {
  return JSON.stringify(sortValue(value), null, 2) + "\n";
}

function sortValue(value) {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === "object") {
    const output = {};
    for (const key of Object.keys(value).sort()) {
      output[key] = sortValue(value[key]);
    }
    return output;
  }

  return value;
}

module.exports = {
  stableStringify,
};
