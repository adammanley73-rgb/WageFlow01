const path = require("path");

module.exports = {
  webpack: (config) => {
    config.resolve.alias["@components"] = path.join(__dirname, "components");
    config.resolve.alias["@lib"] = path.join(__dirname, "lib");
    config.resolve.alias["@app"] = path.join(__dirname, "app");
    config.resolve.alias["@"] = path.join(__dirname);
    return config;
  },
};
