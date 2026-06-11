export const SQL_RUNTIME_SETTABLE_CONFIG_SETTINGS = new Set([
  'work_mem',
  'maintenance_work_mem',
  'effective_cache_size',
  'random_page_cost',
  'effective_io_concurrency',
  'max_parallel_workers_per_gather',
  'track_io_timing',
  'log_min_duration_statement',
  'log_lock_waits',
  'log_temp_files',
]);

export function normalizeConfigSettingName(setting: string): string {
  return setting.trim().replace(/^"|"$/g, '').toLowerCase();
}

export function isSqlRuntimeSettableConfigSetting(setting: string): boolean {
  return SQL_RUNTIME_SETTABLE_CONFIG_SETTINGS.has(normalizeConfigSettingName(setting));
}

export const CONFIG_COHERENCE_RULES_MARKDOWN = `- Apply a single coherence pass across RAM-sensitive settings before writing final Section 7 targets.
- Use these conservative fallback assumptions when evidence is incomplete and label them explicitly: \`reserve_os_ratio = 30%\`, \`active_complex_queries = 2\`, \`sort_hash_ops_per_query = 2\`, and \`autovacuum_max_workers = 3\`.
- Derive \`shared_buffers_target = 0.25 * RAM\` and \`effective_cache_size_target = 0.75 * RAM\` for dedicated database hosts unless measured evidence justifies a different bound.
- Derive \`available_query_memory = (RAM * (1 - reserve_os_ratio)) - shared_buffers_budget - maintenance_work_mem - (autovacuum_max_workers * autovacuum_work_mem)\` before sizing \`work_mem\`.
- Derive \`work_mem_target = floor(available_query_memory / max(1, active_complex_queries * sort_hash_ops_per_query))\`, then cap assumption-driven outputs at \`64 MB\` unless stronger evidence and explicit concurrency data justify a higher value.
- If the memory budget becomes negative or the derived targets conflict with the peak-memory safety budget, clamp or withhold the target and explain the conflict instead of emitting contradictory values.`;

export const SQL_RUNTIME_SETTABLE_CONFIG_RULES_MARKDOWN = `- For GFS configuration validation candidates, only test settings that can be changed in SQL with \`SET\`, \`SET LOCAL\`, and \`RESET\` during the validation session.
- Allowed session-level config examples: \`work_mem\`, \`maintenance_work_mem\`, \`effective_cache_size\`, \`random_page_cost\`, \`effective_io_concurrency\`, \`max_parallel_workers_per_gather\`, \`track_io_timing\`, \`log_min_duration_statement\`, \`log_lock_waits\`, and \`log_temp_files\`.
- Do not schedule GFS config validations for restart-only or config-file-only settings such as \`shared_buffers\`, \`max_wal_size\`, \`checkpoint_timeout\`, or \`checkpoint_completion_target\`. These may still appear in Section 7 as calculated gaps, but not as session-level GFS config tests.`;
