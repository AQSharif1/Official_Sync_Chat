import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, User, Sparkles, Edit3, Brain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  genres: string[];
  personality: string[];
  habits: string[];
  username: string;
}

interface UsernameStepProps {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const adjectives = [
  'Cool', 'Mystic', 'Bright', 'Swift', 'Noble', 'Cosmic', 'Golden', 'Silent',
  'Bold', 'Gentle', 'Radiant', 'Ancient', 'Fierce', 'Serene', 'Clever', 'Wild'
];

const animals = [
  'Giraffe', 'Penguin', 'Butterfly', 'Falcon', 'Dragon', 'Wolf', 'Phoenix', 'Dolphin',
  'Tiger', 'Owl', 'Rabbit', 'Fox', 'Eagle', 'Panda', 'Lion', 'Whale'
];

const generateRandomUsername = () => {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const number = Math.floor(Math.random() * 9999) + 1;
  return `${adjective}${animal}${number}`;
};

const generateUniqueUsername = async (): Promise<string> => {
  let attempts = 0;
  const maxAttempts = 50;
  
  while (attempts < maxAttempts) {
    const username = generateRandomUsername();
    
    // Check if username already exists in database
    const { data: existingUser, error } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('username', username)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking username uniqueness:', error);
      attempts++;
      continue;
    }
    
    // If no existing user found, username is unique
    if (!existingUser) {
      return username;
    }
    
    attempts++;
  }
  
  // Fallback: add timestamp if we can't find unique username
  const fallbackUsername = generateRandomUsername();
  return `${fallbackUsername}${Date.now().toString().slice(-4)}`;
};

export const UsernameStep = ({ profile, updateProfile }: UsernameStepProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [hasUsedEdit, setHasUsedEdit] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const generateInitialUsername = async () => {
      if (!profile.username) {
        setIsGenerating(true);
        try {
          const uniqueUsername = await generateUniqueUsername();
          updateProfile({ username: uniqueUsername });
        } catch (error) {
          console.error('Error generating initial username:', error);
          // Fallback to simple random generation
          const fallbackUsername = generateRandomUsername();
          updateProfile({ username: fallbackUsername });
        } finally {
          setIsGenerating(false);
        }
      }
    };

    generateInitialUsername();
  }, [profile.username, updateProfile]);

  const handleGenerateNew = async () => {
    setIsGenerating(true);
    try {
      const uniqueUsername = await generateUniqueUsername();
      updateProfile({ username: uniqueUsername });
    } catch (error) {
      console.error('Error generating new username:', error);
      // Fallback to simple random generation
      const fallbackUsername = generateRandomUsername();
      updateProfile({ username: fallbackUsername });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = () => {
    setEditValue(profile.username);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editValue.trim() && editValue.trim() !== profile.username) {
      updateProfile({ username: editValue.trim() });
      setHasUsedEdit(true);
    }
    setIsEditing(false);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditValue('');
  };

  const getPersonalityInsight = () => {
    const traits = profile.personality;
    if (traits.length === 0) return "Ready to meet your perfect group!";
    
    const primaryTrait = traits[0];
    const insights = {
      'Funny': "Your humor will be the glue that brings groups together! 😄",
      'Chill': "Your laid-back vibe creates the perfect atmosphere for deep conversations. 🌊",
      'Deep Thinker': "Groups love meaningful discussions with thoughtful people like you. 🧠",
      'Adventurous': "Your energy will inspire groups to try new things together! 🚀",
      'Creative': "Your imagination will spark amazing group activities! 🎨",
      'Empathetic': "Your understanding nature makes everyone feel welcome. 💙"
    };
    
    return insights[primaryTrait as keyof typeof insights] || "You'll bring something special to every group! ✨";
  };

  return (
    <div className="space-y-8">
      {/* Username Display */}
      <div className="text-center space-y-6">
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-2xl font-semibold">Meet Your Identity</h3>
        </div>

        <Card className="p-8 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          {!isEditing ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {profile.username}
                </span>
                <Sparkles className="w-5 h-5 text-accent" />
              </div>
              
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleGenerateNew}
                  disabled={isGenerating}
                  className="gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  {isGenerating ? 'Generating...' : 'Generate New'}
                </Button>
                
                {!hasUsedEdit && (
                  <Button
                    variant="ghost"
                    onClick={handleEdit}
                    className="gap-2 text-muted-foreground"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Once (Free)
                  </Button>
                )}
              </div>
              
              {hasUsedEdit && (
                <Badge variant="secondary" className="mx-auto">
                  Free edit used
                </Badge>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="Enter your username"
                className="text-center text-xl font-semibold bg-background"
                maxLength={20}
              />
              <div className="flex items-center justify-center gap-3">
                <Button onClick={handleSaveEdit} size="sm">
                  Save
                </Button>
                <Button variant="ghost" onClick={handleCancelEdit} size="sm">
                  Cancel
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                This is your one free edit. Choose wisely!
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Personality Insight */}
      <Card className="p-6 bg-muted/30 border-border/50">
        <div className="text-center space-y-3">
          <h4 className="text-lg font-semibold flex items-center justify-center gap-2">
            <Brain className="w-5 h-5 text-accent" />
            Your Group Personality
          </h4>
          <p className="text-muted-foreground">{getPersonalityInsight()}</p>
        </div>
      </Card>

      {/* Profile Summary */}
      <Card className="p-6 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-center">Profile Summary</h4>
          <div className="grid md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{profile.genres.length}</div>
              <div className="text-sm text-muted-foreground">Favorite Genres</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-accent">{profile.personality.length}</div>
              <div className="text-sm text-muted-foreground">Personality Traits</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary-glow">{profile.habits.length}</div>
              <div className="text-sm text-muted-foreground">Communication Habits</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Anonymous Notice */}
      <div className="text-center text-sm text-muted-foreground bg-muted/20 rounded-lg p-4">
        <p>
          🔒 <strong>100% Anonymous</strong> - We never ask for personal information like email, phone, or photos.
          Your privacy is our priority.
        </p>
      </div>
    </div>
  );
};