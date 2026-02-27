'use client';

import { useState, useRef, useCallback, useMemo, createContext } from 'react';
import * as React from 'react';
import { Download, Copy, FileText } from 'lucide-react';
import { Button } from '../../../shadcn/button';
import { Checkbox } from '../../../shadcn/checkbox';
import { Label } from '../../../shadcn/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../shadcn/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

export interface ChartWrapperProps {
  title?: string;
  children: React.ReactNode;
  chartRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
  showAxisLabels?: boolean;
  onShowAxisLabelsChange?: (show: boolean) => void;
  hideAxisLabelsCheckbox?: boolean;
  chartData?: Array<Record<string, unknown>>;
}

// Context to pass axis label visibility to chart components
export const ChartContext = createContext<{
  showAxisLabels: boolean;
}>({
  showAxisLabels: true,
});

/**
 * Enhanced chart wrapper with title, download, and copy functionality
 */
import { exportToCSV } from '@qwery/shared/export';

export function ChartWrapper({
  title,
  children,
  chartRef,
  className,
  showAxisLabels: controlledShowAxisLabels,
  onShowAxisLabelsChange,
  hideAxisLabelsCheckbox = false,
  chartData,
}: ChartWrapperProps) {
  const [internalShowAxisLabels, setInternalShowAxisLabels] = useState(true);
  const internalRef = useRef<HTMLDivElement>(null);
  const ref = chartRef || internalRef;

  // Use controlled or internal state
  const showAxisLabels =
    controlledShowAxisLabels !== undefined
      ? controlledShowAxisLabels
      : internalShowAxisLabels;

  const handleShowAxisLabelsChange = (checked: boolean) => {
    if (onShowAxisLabelsChange) {
      onShowAxisLabelsChange(checked);
    } else {
      setInternalShowAxisLabels(checked);
    }
  };

  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- ref is stable, ref.current access is intentional
  const downloadAsPNG = useCallback(async () => {
    const currentRef = ref.current;
    if (!currentRef) {
      toast.error('Chart element not found');
      return;
    }

    try {
      // Find the SVG element within the chart container
      const svgElement = currentRef.querySelector('svg');
      if (!svgElement) {
        toast.error('SVG element not found in chart');
        return;
      }

      // Clone the SVG to avoid modifying the original
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;

      const textElements = clonedSvg.querySelectorAll('text, tspan');
      textElements.forEach((textEl) => {
        const element = textEl as SVGTextElement;
        const currentStyle = element.getAttribute('style') || '';
        const fontFamily =
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';
        const newStyle = currentStyle
          ? `${currentStyle}; font-family: ${fontFamily};`
          : `font-family: ${fontFamily};`;
        element.setAttribute('style', newStyle);
      });

      // Get SVG viewBox or dimensions
      const viewBox = clonedSvg.getAttribute('viewBox');
      let width = 0;
      let height = 0;

      if (viewBox) {
        const parts = viewBox.split(' ');
        if (parts.length >= 4) {
          width = parseFloat(parts[2] || '0') || 0;
          height = parseFloat(parts[3] || '0') || 0;
        }
      } else {
        const widthAttr = clonedSvg.getAttribute('width');
        const heightAttr = clonedSvg.getAttribute('height');
        width = parseFloat(widthAttr || '0') || 0;
        height = parseFloat(heightAttr || '0') || 0;
      }

      // If no dimensions found, use bounding rect
      if (!width || !height) {
        const rect = svgElement.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
      }

      // Ensure minimum dimensions
      if (width < 100) width = 800;
      if (height < 100) height = 600;

      const titleHeight = title ? 48 : 0;
      const titlePadding = 16;
      const totalHeight = height + titleHeight;

      // Set explicit dimensions on cloned SVG
      clonedSvg.setAttribute('width', width.toString());
      clonedSvg.setAttribute('height', height.toString());
      clonedSvg.setAttribute('style', 'background: transparent;');

      // Serialize SVG
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([svgData], {
        type: 'image/svg+xml;charset=utf-8',
      });
      const svgUrl = URL.createObjectURL(svgBlob);

      // Create canvas with space for title
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = totalHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        toast.error('Failed to create canvas context');
        URL.revokeObjectURL(svgUrl);
        return;
      }

      // Set transparent background
      ctx.clearRect(0, 0, width, totalHeight);

      // Draw title if it exists
      if (title) {
        // Get the actual title element to extract its computed color
        const titleElement = currentRef?.querySelector('h3');
        let titleColor = '#000000'; // Default to black
        if (titleElement) {
          const computedStyle = window.getComputedStyle(titleElement);
          titleColor = computedStyle.color || titleColor;
        } else {
          // Fallback: try to get from CSS variable
          const rootStyle = getComputedStyle(document.documentElement);
          const foregroundVar = rootStyle.getPropertyValue('--foreground');
          if (foregroundVar) {
            titleColor = foregroundVar.trim();
          }
        }

        ctx.fillStyle = titleColor;
        ctx.font =
          'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(title, width / 2, titlePadding + 16);
      }

      // Load SVG as image
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        // Draw SVG image below the title
        ctx.drawImage(img, 0, titleHeight, width, height);
        URL.revokeObjectURL(svgUrl);

        // Convert canvas to PNG with transparent background
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              toast.error('Failed to create image blob');
              return;
            }

            // Download the image
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `${title || 'chart'}-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);

            toast.success('Chart downloaded as PNG');
          },
          'image/png',
          1.0,
        );
      };

      img.onerror = () => {
        toast.error('Failed to load SVG image');
        URL.revokeObjectURL(svgUrl);
      };

      img.src = svgUrl;
    } catch (error) {
      console.error('Error downloading chart:', error);
      toast.error('Failed to download chart');
    }
  }, [ref, title]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- ref is stable, ref.current access is intentional
  const copySVG = useCallback(async () => {
    const currentRef = ref.current;
    if (!currentRef) {
      toast.error('Chart element not found');
      return;
    }

    try {
      const svgElement = currentRef.querySelector('svg');
      if (!svgElement) {
        toast.error('SVG element not found in chart');
        return;
      }

      // Get the SVG code
      const svgCode = new XMLSerializer().serializeToString(svgElement);

      await navigator.clipboard.writeText(svgCode);
      toast.success('SVG code copied to clipboard');
    } catch (error) {
      console.error('Error copying SVG:', error);
      toast.error('Failed to copy SVG code');
    }
  }, [ref]);

  /* eslint-disable react-hooks/preserve-manual-memoization -- ref.current read at call time, not as reactive dep */
  const downloadAsSVG = useCallback(() => {
    const currentRef = ref.current;
    if (!currentRef) {
      toast.error('Chart element not found');
      return;
    }
    try {
      const svgElement = currentRef.querySelector('svg');
      if (!svgElement) {
        toast.error('SVG element not found in chart');
        return;
      }
      const svgCode = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgCode], {
        type: 'image/svg+xml;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title || 'chart'}-${Date.now()}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Chart downloaded as SVG');
    } catch (error) {
      console.error('Error downloading SVG:', error);
      toast.error('Failed to download SVG');
    }
  }, [ref, title]);

  const exportAsCSV = useCallback(() => {
    if (!chartData || chartData.length === 0) {
      toast.error('No data available to export');
      return;
    }

    try {
      exportToCSV(chartData, `${title || 'chart'}-data-${Date.now()}`);
      toast.success('Chart data exported as CSV');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    }
  }, [chartData, title]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ showAxisLabels }), [showAxisLabels]);

  return (
    <div className={cn('relative flex flex-col gap-4', className)}>
      {/* Header Section */}
      <div className="flex items-start justify-between gap-4">
        {title && (
          <div className="flex-1 space-y-0.5">
            <h3 className="text-foreground text-base font-semibold tracking-tight md:text-lg">
              {title}
            </h3>
          </div>
        )}

        {/* Controls Group */}
        <div className="flex items-center gap-1">
          {!hideAxisLabelsCheckbox && (
            <div className="mr-2 flex items-center gap-2">
              <Checkbox
                id="show-axis-labels"
                checked={showAxisLabels}
                onCheckedChange={(checked) =>
                  handleShowAxisLabelsChange(checked === true)
                }
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary h-3.5 w-3.5"
              />
              <Label
                htmlFor="show-axis-labels"
                className="text-muted-foreground cursor-pointer text-[10px] font-medium tracking-wider uppercase select-none"
              >
                Labels
              </Label>
            </div>
          )}

          <div className="bg-background/50 flex items-center rounded-md border shadow-sm">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:bg-muted/50 h-7 w-7 rounded-none border-r px-0 first:rounded-l-md"
                  title="Download"
                >
                  <Download className="text-muted-foreground h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={downloadAsPNG}>
                  Download as PNG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={downloadAsSVG}>
                  Download as SVG
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              onClick={copySVG}
              className="hover:bg-muted/50 h-7 w-7 rounded-none border-r px-0"
              title="Copy SVG"
            >
              <Copy className="text-muted-foreground h-3.5 w-3.5" />
            </Button>
            {chartData && chartData.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={exportAsCSV}
                className="hover:bg-muted/50 h-7 w-7 rounded-none px-0 last:rounded-r-md"
                title="Export data as CSV"
              >
                <FileText className="text-muted-foreground h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <ChartContext.Provider value={contextValue}>
        <div ref={ref} className="w-full p-4">
          {children}
        </div>
      </ChartContext.Provider>
    </div>
  );
}
