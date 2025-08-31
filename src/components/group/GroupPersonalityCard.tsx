import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Zap, Users, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface GroupPersonality {
  dominant_traits: string[];
  energy_level: number;
  interaction_style: string;
  favorite_activities: string[];
  group_vibe_score: number;
  last_updated: Date;
}

interface GroupPersonalityCardProps {
  groupId: string;
}

export const GroupPersonalityCard = ({ groupId }: GroupPersonalityCardProps) => {
  const [personality, setPersonality] = useState<GroupPersonality | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroupPersonality();
  }, [groupId]);

  const fetchGroupPersonality = async () => {
    try {
      const { data, error } = await supabase
        .from('group_personalities' as any)
        .select('*')
        .eq('group_id', groupId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching group personality:', error);
        return;
      }

      if (data) {
        const personalityData = data as any;
        setPersonality({
          dominant_traits: personalityData.dominant_traits || [],
          energy_level: personalityData.energy_level || 5,
          interaction_style: personalityData.interaction_style || 'balanced',
          favorite_activities: personalityData.favorite_activities || [],
          group_vibe_score: personalityData.group_vibe_score || 50,
          last_updated: new Date(personalityData.last_updated)
        });
      }
    } catch (error) {
      console.error('Error fetching group personality:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <div>Loading group vibe...</div>
        </CardContent>
      </Card>
    );
  }

  if (!personality) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <Brain className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Group personality will develop as members interact
          </p>
        </CardContent>
      </Card>
    );
  }

  const getEnergyDescription = (level: number) => {
    if (level <= 3) return 'Chill & Relaxed';
    if (level <= 6) return 'Balanced Energy';
    return 'High Energy';
  };

  const getVibeColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-orange-600';
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-primary" />
          Group Personality
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Energy Level</span>
            </div>
            <Progress value={personality.energy_level * 10} className="mb-1" />
            <p className="text-xs text-muted-foreground">
              {getEnergyDescription(personality.energy_level)}
            </p>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-4 w-4 text-pink-500" />
              <span className="text-sm font-medium">Vibe Score</span>
            </div>
            <Progress value={personality.group_vibe_score} className="mb-1" />
            <p className={`text-xs ${getVibeColor(personality.group_vibe_score)}`}>
              {personality.group_vibe_score}/100
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Interaction Style</span>
          </div>
          <Badge variant="outline" className="capitalize">
            {personality.interaction_style}
          </Badge>
        </div>

        {personality.dominant_traits.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Dominant Traits</h4>
            <div className="flex flex-wrap gap-1">
              {personality.dominant_traits.slice(0, 4).map((trait, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {trait}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Last updated: {personality.last_updated.toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
};