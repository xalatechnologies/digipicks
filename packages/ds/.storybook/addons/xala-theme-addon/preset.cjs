/**
 * Storybook preset for Xala Theme Addon
 * 
 * This preset ensures the addon loads at the right time
 * and integrates properly with Storybook's addon system.
 */

function managerEntries(entry = []) {
  return [...entry, require.resolve('./register.tsx')];
}

module.exports = {
  managerEntries,
};
