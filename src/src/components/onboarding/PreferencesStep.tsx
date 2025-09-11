
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heart, Brain, Clock } from 'lucide-react';

interface UserProfile {
  genres: string[];
  personality: string[];
  habits: string[];
  username: string;
}

interface PreferencesStepProps {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const genreOptions = [
  'Comedy', 'Thriller', 'Anime', 'Drama', 'Sci-Fi', 'Horror',
  'Romance', 'Action', 'Documentary', 'Fantasy', 'Mystery', 'Adventure'
];

const personalityOptions = [
  'Funny', 'Chill', 'Deep Thinker', 'Adventurous', 'Creative', 'Analytical',
  'Empathetic', 'Optimistic', 'Curious', 'Spontaneous', 'Loyal', 'Ambitious'
];

const habitOptions = [
  'Night Owl', 'Early Bird', 'Busy Texter', 'Voice Message Fan', 'Emoji Lover',
  'Binge Watcher', 'Quick Replier', 'Thoughtful Responder', 'Always Online',
  'Weekend Warrior', 'Coffee Addict', 'Tea Enthusiast'
];

export const PreferencesStep = ({ profile, updateProfile }: PreferencesStepProps) => {
  const handleTagToggle = (category: keyof Pick<UserProfile, 'genres' | 'personality' | 'habits'>, value: string) => {
    const currentValues = profile[category];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(item => item !== value)
      : [...currentValues, value];
    
    updateProfile({ [category]: newValues });
  };


  const TagButton = ({ 
    value, 
    isSelected, 
    onClick 
  }: { 
    value: string; 
    isSelected: boolean; 
    onClick: () => void; 
  }) => (
    <Button
      variant={isSelected ? "tag-selected" : "tag"}
      onClick={onClick}
      className="h-auto py-3 px-4 text-left"
    >
      {value}
    </Button>
  );

  return (
    <div className="space-y-8">
      {/* Favorite Genres */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Heart className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">Favorite Genres</h3>
        </div>
        <p className="text-muted-foreground">What do you love watching or discussing?</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {genreOptions.map((genre) => (
            <TagButton
              key={genre}
              value={genre}
              isSelected={profile.genres.includes(genre)}
              onClick={() => handleTagToggle('genres', genre)}
            />
          ))}
        </div>
      </div>

      {/* Personality Traits */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
            <Brain className="w-4 h-4 text-accent" />
          </div>
          <h3 className="text-xl font-semibold">Personality Traits</h3>
        </div>
        <p className="text-muted-foreground">How would your friends describe you?</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {personalityOptions.map((trait) => (
            <TagButton
              key={trait}
              value={trait}
              isSelected={profile.personality.includes(trait)}
              onClick={() => handleTagToggle('personality', trait)}
            />
          ))}
        </div>
      </div>

      {/* Habits */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-glow/10 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-primary-glow" />
          </div>
          <h3 className="text-xl font-semibold">Your Habits</h3>
        </div>
        <p className="text-muted-foreground">What describes your communication style?</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {habitOptions.map((habit) => (
            <TagButton
              key={habit}
              value={habit}
              isSelected={profile.habits.includes(habit)}
              onClick={() => handleTagToggle('habits', habit)}
            />
          ))}
        </div>
      </div>


      {/* Selection Summary */}
      {(profile.genres.length > 0 || profile.personality.length > 0 || profile.habits.length > 0) && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="text-sm text-muted-foreground">
            <strong>Selected:</strong> {' '}
            {[...profile.genres, ...profile.personality, ...profile.habits].length} preferences
          </div>
        </Card>
      )}
    </div>
  );
};