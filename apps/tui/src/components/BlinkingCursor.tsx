import { useState, useEffect } from 'react';
import { useStyles } from '../theme/index.ts';

const BLINK_INTERVAL_MS = 530;

export function BlinkingCursor() {
  const { cursorStyle } = useStyles();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(
      () => setVisible((v: boolean) => !v),
      BLINK_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, []);

  return <span {...cursorStyle}>{visible ? '█' : ' '}</span>;
}
