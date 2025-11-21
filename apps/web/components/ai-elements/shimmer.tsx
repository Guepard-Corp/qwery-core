'use client';

import { cn } from '~/lib/utils';
import { motion } from 'motion/react';
import React, {
  type CSSProperties,
  type ElementType,
  type JSX,
  memo,
  useMemo,
} from 'react';

export type TextShimmerProps = {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
};

const motionComponentCache = new Map<
  keyof JSX.IntrinsicElements,
  ReturnType<typeof motion.create>
>();

const getMotionComponent = (component: keyof JSX.IntrinsicElements) => {
  if (!motionComponentCache.has(component)) {
    motionComponentCache.set(component, motion.create(component));
  }
  return motionComponentCache.get(component)!;
};

const ShimmerComponent = ({
  children,
  as: Component = 'p',
  className,
  duration = 2,
  spread = 2,
}: TextShimmerProps) => {
  const MotionComponent = useMemo(
    () => getMotionComponent(Component as keyof JSX.IntrinsicElements),
    [Component],
  );

  const dynamicSpread = useMemo(
    () => (children?.length ?? 0) * spread,
    [children, spread],
  );

  const MotionElement = MotionComponent as React.ComponentType<
    React.HTMLAttributes<HTMLElement> & {
      animate?: { backgroundPosition: string };
      initial?: { backgroundPosition: string };
      transition?: {
        repeat: number;
        duration: number;
        ease: string;
      };
    }
  >;

  return (
    <MotionElement
      animate={{ backgroundPosition: '0% center' }}
      className={cn(
        'relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent',
        '[background-repeat:no-repeat,padding-box] [--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--color-background),#0000_calc(50%+var(--spread)))]',
        className,
      )}
      initial={{ backgroundPosition: '100% center' }}
      style={
        {
          '--spread': `${dynamicSpread}px`,
          backgroundImage:
            'var(--bg), linear-gradient(var(--color-muted-foreground), var(--color-muted-foreground))',
        } as CSSProperties
      }
      transition={{
        repeat: Number.POSITIVE_INFINITY,
        duration,
        ease: 'linear',
      }}
    >
      {children}
    </MotionElement>
  );
};

export const Shimmer = memo(ShimmerComponent);
