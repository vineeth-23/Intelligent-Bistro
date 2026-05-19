const { getDefaultConfig } = require("@expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const projectNodeModules = path.resolve(projectRoot, "node_modules");
const workspaceNodeModules = path.resolve(workspaceRoot, "node_modules");
const config = getDefaultConfig(projectRoot);
const resolvePackageRoot = (packageName) =>
  path.dirname(require.resolve(`${packageName}/package.json`, { paths: [projectRoot] }));

config.watchFolders = [workspaceRoot];
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [projectNodeModules, workspaceNodeModules];
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "@react-native/virtualized-lists": resolvePackageRoot("@react-native/virtualized-lists"),
  react: resolvePackageRoot("react"),
  "react-native": resolvePackageRoot("react-native")
};

module.exports = config;
