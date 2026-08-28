const { defineConfig } = require('eslint/config');
const js = require('@eslint/js');

module.exports = defineConfig([
  js.configs.recommended,
  {
    ignores: ['dist/*', 'node_modules/*'],
  },
]);
