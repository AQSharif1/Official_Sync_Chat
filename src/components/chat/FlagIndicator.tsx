import React from 'react';
import { Flag } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface FlagIndicatorProps {
  reason?: string;
  confidence?: number;
}

export const FlagIndicator: React.FC<FlagIndicatorProps> = ({ 
  reason = 'Flagged for review', 
  confidence 
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center">
          <Flag 
            size={14} 
            className="text-gray-400 hover:text-gray-600 transition-colors" 
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="text-sm">
          <p className="font-medium">Content flagged</p>
          <p className="text-muted-foreground">{reason}</p>
          {confidence && (
            <p className="text-xs text-muted-foreground mt-1">
              Confidence: {Math.round(confidence * 100)}%
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};