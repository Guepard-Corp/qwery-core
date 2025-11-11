import { Trans as TransComponent } from 'react-i18next/TransWithoutContext';

export function Trans(props: React.ComponentProps<typeof TransComponent>) {
  return <TransComponent {...props} />;
}
