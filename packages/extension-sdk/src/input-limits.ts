/**
 * Shared maximum lengths for datasource connection form inputs.
 * Used by extension schemas (Zod `.max`) and the host UI.
 */
export const DATASOURCE_INPUT_MAX_LENGTH = {
  name: 80,
  host: 255,
  port: 5,
  database: 128,
  username: 128,
  password: 512,
  connectionString: 4096,
  url: 2048,
  sharedLink: 2048,
  apiKey: 1024,
  endpointUrl: 2048,
  accessKeyId: 128,
  secretAccessKey: 256,
  sessionToken: 2048,
  region: 64,
  bucket: 63,
  prefix: 1024,
  patternList: 2048,
} as const;
