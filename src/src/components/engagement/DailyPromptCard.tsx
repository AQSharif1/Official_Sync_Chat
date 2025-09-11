import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, Clock } from 'lucide-react';
import { DailyPrompt } from '@/hooks/useDailyPrompts';

interface DailyPromptCardProps {
  prompt: DailyPrompt;
  onRespond: (promptText: string) => void;
}

export const DailyPromptCard = ({ prompt, onRespond }: DailyPromptCardProps) => {
  const timeUntilExpiry = prompt.expires_at.getTime() - new Date().getTime();
  const hoursLeft = Math.max(0, Math.floor(timeUntilExpiry / (1000 * 60 * 60)));

  return (
    <Card className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Daily Prompt</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className="text-xs">
              {hoursLeft}h left
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-base leading-relaxed">{prompt.prompt_text}</p>
        <Button 
          onClick={() => onRespond(prompt.prompt_text)}
          className="w-full"
          size="sm"
        >
          Respond to Prompt
        </Button>
      </CardContent>
    </Card>
  );
};