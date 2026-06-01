// Friendly, human-readable default names for datasources, in the same
// adjective-noun-suffix shape db-audit uses (e.g. `misty-river-a8b2c1`).
// Memorable and collision-resistant enough for a default the user can rename.

const ADJECTIVES = [
  'misty',
  'silent',
  'quiet',
  'bright',
  'dark',
  'mysterious',
  'ancient',
  'quick',
  'lazy',
  'wild',
  'fierce',
  'happy',
  'gentle',
  'bold',
  'calm',
];

const NOUNS = [
  'sound',
  'forest',
  'river',
  'mountain',
  'valley',
  'ocean',
  'sky',
  'star',
  'moon',
  'sun',
  'wind',
  'storm',
  'rain',
  'cloud',
  'shadow',
];

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

export function generateRandomName(): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}-${suffix}`;
}
