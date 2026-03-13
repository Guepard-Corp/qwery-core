import { useState, useEffect } from 'react';

export function useBrandTypingAnimation() {
  const [brandText, setBrandText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const targetText = 'Query';
    const finalText = 'Qwery';
    let currentIndex = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const typeText = (text: string, callback: () => void) => {
      if (currentIndex < text.length) {
        setBrandText(text.slice(0, currentIndex + 1));
        currentIndex++;
        timeoutId = setTimeout(() => typeText(text, callback), 100);
      } else {
        callback();
      }
    };

    const deleteText = (callback: () => void) => {
      if (currentIndex > 0) {
        setBrandText(targetText.slice(0, currentIndex - 1));
        currentIndex--;
        timeoutId = setTimeout(() => deleteText(callback), 50);
      } else {
        callback();
      }
    };

    const startAnimation = () => {
      currentIndex = 0;
      setBrandText('');
      setShowCursor(true);
      typeText(targetText, () => {
        setTimeout(() => {
          currentIndex = targetText.length;
          deleteText(() => {
            currentIndex = 0;
            typeText(finalText, () => {
              setTimeout(() => setShowCursor(false), 500);
            });
          });
        }, 1000);
      });
    };

    startAnimation();

    return () => clearTimeout(timeoutId);
  }, []);

  return { brandText, showCursor };
}
