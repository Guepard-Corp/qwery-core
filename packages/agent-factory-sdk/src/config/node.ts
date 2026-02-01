/**
 * Node-only config: load agents and skills from disk.
 * Import from `@qwery/agent-factory-sdk/config/node` in server code only.
 * Do not import in client/browser code (uses node:fs).
 */
export { loadAgentsFromDirectory } from './agents-from-disk';
export { loadSkillsFromDirectory } from './skills-from-disk';
export type { SkillInfo } from './skills-cache';
