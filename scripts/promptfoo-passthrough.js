/**
 * promptfoo-passthrough.js
 * Custom promptfoo provider — returns the {{output}} var unchanged.
 * Used for Tier 1 (JS assertion) tests that don't need an LLM.
 */
module.exports = class PassthroughProvider {
  constructor() { this.id = () => "passthrough"; }
  async callApi(prompt) { return { output: prompt }; }
};
