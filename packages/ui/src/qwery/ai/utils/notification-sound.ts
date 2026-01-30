/**
 * Notification sound utility for agent response completion
 * Plays a subtle, pleasant notification sound similar to Cursor IDE
 */

import { useEffect, useRef } from 'react';
import type { ChatStatus } from 'ai';
import { isResponseInProgress, isChatIdle } from './chat-status';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
  }
  return audioContext;
}

export function playCompletionSound(): void {
  try {
    // Sound is currently muted
    return;
    const ctx = getAudioContext();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const duration = 0.4; // Longer duration for ethereal effect (400ms)

    const oscillators = [
      { freq: 1047, type: 'sine' as OscillatorType, volume: 0.12 }, // C6 - bright
      { freq: 1319, type: 'sine' as OscillatorType, volume: 0.1 }, // E6 - ethereal
      { freq: 1568, type: 'sine' as OscillatorType, volume: 0.08 }, // G6 - sparkle
      { freq: 2093, type: 'sine' as OscillatorType, volume: 0.06 }, // C7 - shimmer
    ];

    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);

    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.3;

    const delay = ctx.createDelay();
    delay.delayTime.value = 0.1;
    const delayGain = ctx.createGain();
    delayGain.gain.value = 0.2;

    delay.connect(delayGain);
    delayGain.connect(delay);
    delay.connect(reverbGain);
    reverbGain.connect(masterGain);

    const oscNodes: OscillatorNode[] = [];

    oscillators.forEach((oscConfig, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.value = oscConfig.freq;
      osc.type = oscConfig.type;

      osc.connect(gain);
      gain.connect(masterGain);
      gain.connect(delay);

      const startTime = now + index * 0.02; // Slight stagger for magical effect
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(oscConfig.volume, startTime + 0.05);
      gain.gain.setValueAtTime(oscConfig.volume, startTime + 0.1);
      // Gentle exponential fade-out
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      if (index < 2) {
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 3 + index; // Slow modulation
        lfoGain.gain.value = oscConfig.freq * 0.02; // Subtle pitch variation
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start(startTime);
        lfo.stop(startTime + duration);
      }

      osc.start(startTime);
      osc.stop(startTime + duration);
      oscNodes.push(osc);
    });

    // Master envelope for overall fade
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(1, now + 0.05);
    masterGain.gain.setValueAtTime(1, now + 0.1);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const firstOsc = oscNodes[0];
    if (firstOsc) {
      firstOsc!.onended = () => {
        if (ctx.state === 'running' && ctx.currentTime - now > 1) {
          setTimeout(() => {
            if (ctx.state === 'running') {
              ctx.suspend().catch(() => {
                // Ignore suspend errors
              });
            }
          }, 1000);
        }
      };
    }
  } catch {
    // Silently fail if audio is not available or blocked
  }
}

export function useCompletionSound(status: ChatStatus | undefined): void {
  const prevStatusRef = useRef(status);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const prevStatus = prevStatusRef.current;
    const currentStatus = status;

    if (isResponseInProgress(prevStatus) && isChatIdle(currentStatus)) {
      // Small delay to ensure UI has updated
      const timeoutId = setTimeout(() => {
        playCompletionSound();
      }, 500);

      return () => clearTimeout(timeoutId);
    }

    prevStatusRef.current = currentStatus;
  }, [status]);
}
