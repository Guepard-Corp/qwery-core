import { createRepositories } from '~/lib/repositories/repositories-factory';

export async function getRepositoriesForLoader(_request: Request) {
  return createRepositories();
}
