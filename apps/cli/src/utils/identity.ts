import { v4 as uuidv4 } from 'uuid';

export interface Identity {
  id: string;
  slug: string;
}

export function createIdentity(): Identity {
  const id = uuidv4();
  const slug = id.split('-')[0] || id.substring(0, 8);
  return { id, slug };
}

