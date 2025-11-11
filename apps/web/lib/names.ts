export const generateRandomName = (): string => {
  const adjectives = [
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
    'sad',
    'angry',
    'joyful',
  ];

  const nouns = [
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

  // Get random element from arrays
  const randomAdjective =
    adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

  // Generate a unique suffix (6 characters of random alphanumeric)
  const uniqueSuffix = Math.random().toString(36).substring(2, 8);

  // Format the final name
  return `${randomAdjective}-${randomNoun}-${uniqueSuffix}`;
};
