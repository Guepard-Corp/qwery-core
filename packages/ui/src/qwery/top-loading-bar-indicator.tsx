'use client';

import { createRef, useEffect, useRef } from 'react';

import { useNavigation } from 'react-router';

import type { LoadingBarRef } from 'react-top-loading-bar';
import LoadingBar from 'react-top-loading-bar';

export function TopLoadingBarIndicator() {
  const ref = createRef<LoadingBarRef>();
  const runningRef = useRef(false);
  const navigation = useNavigation();
  const state = navigation.state;

  useEffect(() => {
    const isIdle = state === 'idle';
    const isRouteLoading = state === 'loading';

    if (isRouteLoading) {
      ref.current?.continuousStart();
    }

    if (isIdle) {
      ref.current?.complete();
      runningRef.current = false;
    }
  }, [ref, state]);

  if (typeof document === 'undefined') {
    return null;
  }

  return (
    <LoadingBar
      className={'bg-primary'}
      height={4}
      waitingTime={0}
      shadow
      color={''}
      ref={ref}
    />
  );
}
