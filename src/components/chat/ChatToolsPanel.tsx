import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, Music, MessageCircle, Gamepad2, Sparkles, Smile, MessageSquare, Zap, Settings } from 'lucide-react';
import { 
  GamePreferences, 
  loadGamePreferences, 
  saveGamePreferences, 
  hasAnyGameEnabled,
  DEFAULT_GAME_PREFERENCES 
} from '@/utils/gamePreferences';
interface ChatToolsPanelProps {
  onToolSelect: (tool: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}
export const ChatToolsPanel = ({
  onToolSelect,
  isOpen,
  onToggle
}: ChatToolsPanelProps) => {
  const { toast } = useToast();
  const [gamePrefs, setGamePrefs] = useState<GamePreferences>(DEFAULT_GAME_PREFERENCES);
  const [showGamePrefs, setShowGamePrefs] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    const prefs = loadGamePreferences();
    setGamePrefs(prefs);
  }, []);

  // Clear timers on tab/group change via page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Clear any potential game timers when tab becomes hidden
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleGamePrefChange = (key: keyof GamePreferences['enabledGames'], value: boolean) => {
    const newPrefs = {
      ...gamePrefs,
      enabledGames: {
        ...gamePrefs.enabledGames,
        [key]: value,
      },
    };
    setGamePrefs(newPrefs);
    saveGamePreferences(newPrefs);
  };

  const handleDurationChange = (value: number[]) => {
    const newPrefs = {
      ...gamePrefs,
      gameDuration: value[0],
    };
    setGamePrefs(newPrefs);
    saveGamePreferences(newPrefs);
  };

  const handleGamePrefsClose = () => {
    setShowGamePrefs(false);
    toast({
      title: "Preferences saved",
      description: "Game preferences have been updated.",
    });
  };
  const tools = [{
    id: 'poll',
    name: 'Create Poll',
    description: 'Ask the group a question',
    icon: BarChart3,
    color: 'text-blue-600',
    command: '/poll',
    enabled: true, // Always enabled
  }, {
    id: 'playlist',
    name: 'Playlist',
    description: 'Build music together',
    icon: Music,
    color: 'text-green-600',
    command: '/playlist',
    enabled: true, // Always enabled
  }, {
    id: 'wouldyourather',
    name: 'Would You Rather',
    description: 'Daily choice questions',
    icon: MessageCircle,
    color: 'text-purple-600',
    command: '/wouldyourather',
    enabled: true, // Always enabled
  }, {
    id: 'truthslie',
    name: 'Two Truths & A Lie',
    description: 'Guess the lie game',
    icon: MessageSquare,
    color: 'text-orange-600',
    command: '/truthslie',
    enabled: gamePrefs.enabledGames.twoTruths,
  }, {
    id: 'thisorthat',
    name: 'This or That',
    description: 'Quick choice polls',
    icon: Smile,
    color: 'text-pink-600',
    command: '/thisorthat',
    enabled: gamePrefs.enabledGames.thisOrThat,
  }, {
    id: 'emojiriddle',
    name: 'Emoji Riddle',
    description: 'Guess the emoji combo',
    icon: Sparkles,
    color: 'text-yellow-600',
    command: '/emojiriddle',
    enabled: gamePrefs.enabledGames.emojiRiddle,
  }];

  const handleToolSelect = (toolId: string) => {
    // Check if any games are enabled for game tools
    if (['truthslie', 'thisorthat', 'emojiriddle'].includes(toolId) && !hasAnyGameEnabled(gamePrefs)) {
      toast({
        title: "No games enabled",
        description: "Enable at least one game in Settings.",
        variant: "destructive",
      });
      return;
    }
    
    // For game tools, we now trigger the start game flow instead of direct creation
    if (['truthslie', 'thisorthat', 'emojiriddle'].includes(toolId)) {
      onToolSelect(`start-${toolId}`);
    } else {
      onToolSelect(toolId);
    }
    onToggle();
  };
  return (
    <>
      <Popover open={isOpen} onOpenChange={onToggle}>
        <PopoverTrigger asChild>
          
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end" side="top">
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4" />
                  Chat Tools & Games
                </CardTitle>
                <Dialog open={showGamePrefs} onOpenChange={setShowGamePrefs}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-6 px-2">
                      <Settings className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Game Preferences</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Enabled Games</Label>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="thisorthat" className="text-sm">This or That</Label>
                          <Switch
                            id="thisorthat"
                            checked={gamePrefs.enabledGames.thisOrThat}
                            onCheckedChange={(checked) => handleGamePrefChange('thisOrThat', checked)}
                            aria-label="Enable This or That game"
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="emojiriddle" className="text-sm">Emoji Riddle</Label>
                          <Switch
                            id="emojiriddle"
                            checked={gamePrefs.enabledGames.emojiRiddle}
                            onCheckedChange={(checked) => handleGamePrefChange('emojiRiddle', checked)}
                            aria-label="Enable Emoji Riddle game"
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="twotruths" className="text-sm">Two Truths & A Lie</Label>
                          <Switch
                            id="twotruths"
                            checked={gamePrefs.enabledGames.twoTruths}
                            onCheckedChange={(checked) => handleGamePrefChange('twoTruths', checked)}
                            aria-label="Enable Two Truths and a Lie game"
                          />
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">
                          Game Duration: {gamePrefs.gameDuration} minutes
                        </Label>
                        <Slider
                          value={[gamePrefs.gameDuration]}
                          onValueChange={handleDurationChange}
                          min={1}
                          max={10}
                          step={1}
                          className="w-full"
                          aria-label="Game duration in minutes"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>1 min</span>
                          <span>10 min</span>
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <Button onClick={handleGamePrefsClose} className="w-full">
                          Save Preferences
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-xs text-muted-foreground">
                Manual games only - configure in Settings
              </p>
            </CardHeader>
            
            <CardContent className="p-3 pt-0">
              <div className="grid grid-cols-2 gap-2">
                {tools.map(tool => {
                  const IconComponent = tool.icon;
                  const isDisabled = !tool.enabled;
                  
                  return (
                    <Button 
                      key={tool.id} 
                      variant="ghost" 
                      className={`h-auto p-3 flex flex-col items-center gap-2 text-center hover:bg-muted/50 ${isDisabled ? 'opacity-50' : ''}`}
                      onClick={() => handleToolSelect(tool.id)}
                      disabled={isDisabled}
                    >
                      <IconComponent className={`h-5 w-5 ${tool.color}`} />
                      <div>
                        <div className="text-xs font-medium">{tool.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {tool.description}
                        </div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {tool.command}
                        </Badge>
                      </div>
                    </Button>
                  );
                })}
              </div>
              
              {!hasAnyGameEnabled(gamePrefs) && (
                <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-xs text-destructive font-medium">
                    Enable at least one game in Settings
                  </p>
                </div>
              )}
              
              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium">Manual Games Only</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Games require manual start via commands</p>
                  <p>Duration set in preferences ({gamePrefs.gameDuration} min)</p>
                  <p>Everyone can participate and vote</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    </>
  );
};