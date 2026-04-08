import appConfig from '~/config/app.config';

export function pageTitle(pageLabel: string): string {
  return `${pageLabel} · ${appConfig.title}`;
}
