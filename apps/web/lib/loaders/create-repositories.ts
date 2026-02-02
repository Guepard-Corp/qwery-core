import { createRepositories } from '~/lib/repositories/repositories-factory';

export async function getRepositoriesForLoader() {
  return createRepositories();
}
