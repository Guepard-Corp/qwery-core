import React from 'react';
import { Database, ArrowRight } from 'lucide-react';
import { ConnectionLines } from './connection-lines';
import { Card, CardHeader, CardTitle, CardContent } from '../../shadcn/card';

export const DatabaseCard: React.FC = () => {
  return (
    <Card className="group relative w-full max-w-[420px] rounded-2xl border-zinc-800 bg-[#09090b] p-1 transition-all duration-300 hover:border-amber-500/30 hover:shadow-2xl hover:shadow-amber-500/10">
      {/* Animated Background Container */}
      <div className="absolute inset-0 z-0">
        <ConnectionLines />
      </div>

      {/* Card Inner Wrapper for Blur Effect and Spacing */}
      <div className="relative z-10 flex h-full flex-col rounded-xl bg-[#09090b]/80 backdrop-blur-[2px] transition-colors duration-500 group-hover:bg-[#09090b]/60">
        <CardHeader className="flex flex-row items-start gap-4 space-y-0 p-6 pb-4">
          <div className="relative mt-1">
            <div className="absolute inset-0 rounded-lg bg-yellow-400 opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-30"></div>
            <div className="relative rounded-lg border border-zinc-800 bg-zinc-900 p-2 transition-colors duration-300 group-hover:border-yellow-500/30">
              <Database className="h-5 w-5 fill-yellow-400/20 text-yellow-400" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded border border-yellow-500/10 bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-yellow-500/80 uppercase">
                PGLite
              </span>
            </div>
            <CardTitle className="truncate font-mono text-lg font-medium tracking-tight text-zinc-100 transition-colors duration-300 group-hover:text-yellow-50">
              play_mysterious-forest-g1g4wt
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6 pt-0">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 border-t border-zinc-800/50 py-2 pt-6">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium tracking-wider text-zinc-500 uppercase">
                Created
              </span>
              <span className="font-mono text-sm font-medium text-zinc-300">
                Dec 6, 2025
              </span>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <span className="text-xs font-medium tracking-wider text-zinc-500 uppercase">
                Created by
              </span>
              <span className="text-sm font-medium text-zinc-300">system</span>
            </div>
          </div>

          {/* Action Button */}
          <button className="group/btn relative w-full cursor-pointer overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 transition-all hover:border-zinc-600 hover:bg-zinc-800 hover:shadow-lg active:scale-[0.98]">
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm font-medium text-zinc-300 transition-colors group-hover/btn:text-white">
                View Database
              </span>
              <ArrowRight className="h-4 w-4 text-zinc-500 transition-all group-hover/btn:translate-x-1 group-hover/btn:text-white" />
            </div>
          </button>
        </CardContent>
      </div>
    </Card>
  );
};
