import { useId, useMemo } from 'react';
import { Link } from 'react-router';

import { cn } from '@qwery/ui/utils';
import { getWorkspaceFromLocalStorage } from '../lib/workspace/workspace-helper';
import pathsConfig from '../config/paths.config';

export function LogoImage({
  className,
  _width = 200,
  size,
}: {
  className?: string;
  _width?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}) {
  // Generate unique IDs to avoid conflicts if multiple logos are on the page
  const idPrefix = `logo-${useId().replace(/:/g, '-')}`;

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
    '2xl': 'w-32 h-32 sm:w-40 sm:h-40',
  };

  const defaultSize = size ? sizeClasses[size] : 'w-[28px] lg:w-[28px]';

  return (
    <svg
      className={cn(defaultSize, className)}
      viewBox="0 0 762.83 1023.51"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <style>
          {`.${idPrefix}-cls-1{fill:none;}.${idPrefix}-cls-2{clip-path:url(#${idPrefix}-clip-path);}.${idPrefix}-cls-3{fill:url(#${idPrefix}-linear-gradient);}.${idPrefix}-cls-4{fill:#ffcb51;}.${idPrefix}-cls-5{fill:url(#${idPrefix}-linear-gradient-2);}.${idPrefix}-cls-6{fill:url(#${idPrefix}-linear-gradient-3);}`}
        </style>
        <clipPath
          id={`${idPrefix}-clip-path`}
          transform="translate(-158.58 -28.24)"
        >
          <rect className={`${idPrefix}-cls-1`} width="1080" height="1080" />
        </clipPath>
        <linearGradient
          id={`${idPrefix}-linear-gradient`}
          x1="540"
          y1="1051.76"
          x2="540"
          y2="52.9"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0.72" stopColor="#ff9551" />
          <stop offset="0.79" stopColor="#ff9a51" />
          <stop offset="0.87" stopColor="#ffa851" />
          <stop offset="0.96" stopColor="#ffbf51" />
          <stop offset="1" stopColor="#ffcb51" />
        </linearGradient>
        <linearGradient
          id={`${idPrefix}-linear-gradient-2`}
          x1="222.17"
          y1="369.4"
          x2="222.17"
          y2="228.22"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#ff9551" />
          <stop offset="0.05" stopColor="#ff9c51" />
          <stop offset="0.22" stopColor="#ffb151" />
          <stop offset="0.41" stopColor="#ffc051" />
          <stop offset="0.64" stopColor="#ffc851" />
          <stop offset="1" stopColor="#ffcb51" />
        </linearGradient>
        <linearGradient
          id={`${idPrefix}-linear-gradient-3`}
          x1="523.7"
          y1="327.65"
          x2="523.7"
          y2="186.46"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#ff9551" />
          <stop offset="0.03" stopColor="#ff9951" />
          <stop offset="0.22" stopColor="#ffaf51" />
          <stop offset="0.43" stopColor="#ffbf51" />
          <stop offset="0.67" stopColor="#ffc851" />
          <stop offset="1" stopColor="#ffcb51" />
        </linearGradient>
      </defs>
      <g id={`${idPrefix}-Layer_2`} data-name="Layer 2">
        <g id={`${idPrefix}-Layer_1-2`} data-name="Layer 1">
          <g className={`${idPrefix}-cls-2`}>
            <path
              className={`${idPrefix}-cls-3`}
              d="M914,377.88q-7.46-35.61-20.73-79.13t-42.28-86.47a440.82,440.82,0,0,0-68-78.56Q744,98.11,678.47,75.51T532.54,52.9q-80.46,0-144.28,23.17t-102,56.52q-38.16,33.36-65.5,80.26t-39,85.34a526.45,526.45,0,0,0-17.41,80.26q-5.83,41.83-5.81,56.52v42.95q0,19.23,5.81,50.3T181,597.74q10.77,38.44,34.82,77.43a439.83,439.83,0,0,0,56.39,72.91q32.34,33.92,87.06,57.65a375.24,375.24,0,0,0,67.63,21.76c36.76,8.22,70.17,27.48,94.91,55.88q125,143.52,194,163.13,66.32,18.06,123.55-26t57.21-96.08q0-22.63-18.24-36.74t-50.58-19.22a529,529,0,0,0-63-6.21q-30.71-1.14-68.82-1.7t-54.72-2.82q-11.74-1.34-23.76-3.66c-13.28-2.55-13.57-21.54-.3-24.13a375.76,375.76,0,0,0,70.49-20.82q58-23.73,94.53-55.39a358.91,358.91,0,0,0,64.67-74.6Q875,636.18,888.25,601.7a579.69,579.69,0,0,0,22.39-72.35q9.09-37.86,10-50.86c.54-8.66.83-15.27.83-19.79V436.1Q921.42,413.49,914,377.88ZM540,653.62c-157.24,0-284.71-127.47-284.71-284.71S382.76,84.2,540,84.2,824.71,211.67,824.71,368.91,697.24,653.62,540,653.62Z"
              transform="translate(-158.58 -28.24)"
            />
            <path
              className={`${idPrefix}-cls-4`}
              d="M914,353.23q-7.46-35.61-20.73-79.13t-42.28-86.47a440.82,440.82,0,0,0-68-78.56Q744,73.46,678.47,50.85T532.54,28.24q-80.46,0-144.28,23.18t-102,56.52q-38.16,33.34-65.5,80.25t-39,85.35a526.32,526.32,0,0,0-17.41,80.25q-5.83,41.83-5.81,56.52v43q0,19.23,5.81,50.3T181,573.09q10.77,38.43,34.82,77.43a439.83,439.83,0,0,0,56.39,72.91q32.34,33.92,87.06,57.65a375.24,375.24,0,0,0,67.63,21.76c36.76,8.22,70.17,27.48,94.91,55.88q125,143.52,194,163.13,66.32,18.06,123.55-26t57.21-96.09q0-22.62-18.24-36.73t-50.58-19.22a531.16,531.16,0,0,0-63-6.22q-30.71-1.12-68.82-1.69t-54.72-2.83q-11.74-1.34-23.76-3.65c-13.28-2.56-13.57-21.54-.3-24.13a375.76,375.76,0,0,0,70.49-20.82q58-23.75,94.53-55.39a358.71,358.71,0,0,0,64.67-74.61Q875,611.53,888.25,577a579,579,0,0,0,22.39-72.34q9.09-37.86,10-50.87c.54-8.65.83-15.26.83-19.78V411.44Q921.42,388.85,914,353.23ZM540,629C382.76,629,255.29,501.5,255.29,344.26S382.76,59.55,540,59.55,824.71,187,824.71,344.26,697.24,629,540,629Z"
              transform="translate(-158.58 -28.24)"
            />
            <circle
              className={`${idPrefix}-cls-5`}
              cx="222.17"
              cy="298.81"
              r="70.59"
            />
            <circle
              className={`${idPrefix}-cls-6`}
              cx="523.7"
              cy="257.06"
              r="70.59"
            />
          </g>
        </g>
      </g>
    </svg>
  );
}

export function AppLogo({
  href,
  label,
  className,
}: {
  href?: string;
  className?: string;
  label?: string;
}) {
  const logoHref = useMemo(() => {
    if (href) return href;

    // Check localStorage for org and proj values
    const workspace = getWorkspaceFromLocalStorage();
    if (workspace.organizationId && workspace.projectId) {
      // If both exist, navigate to dashboard (home page which redirects to project)
      return pathsConfig.app.home;
    }
    // Otherwise, redirect to organizations page
    return pathsConfig.app.organizations;
  }, [href]);

  return (
    <Link aria-label={label ?? 'Home Page'} to={logoHref} prefetch={'viewport'}>
      <LogoImage className={className} />
    </Link>
  );
}
