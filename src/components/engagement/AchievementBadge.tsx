import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Achievement } from '@/hooks/useEngagement';

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export const AchievementBadge = ({ 
  achievement, 
  size = 'md', 
  showDetails = false 
}: AchievementBadgeProps) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  };

  if (showDetails) {
    return (
      <Card className="hover:bg-accent/50 transition-colors">
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`${sizeClasses[size]} flex-shrink-0`}>
            {achievement.badge_icon}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm">{achievement.achievement_title}</h4>
            <p className="text-xs text-muted-foreground">{achievement.achievement_description}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {achievement.points} pts
              </Badge>
              <span className="text-xs text-muted-foreground">
                {achievement.unlocked_at.toLocaleDateString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className={sizeClasses[size]}>{achievement.badge_icon}</span>
      {size !== 'sm' && (
        <div>
          <span className="text-sm font-medium">{achievement.achievement_title}</span>
          <Badge variant="secondary" className="ml-2 text-xs">
            {achievement.points}
          </Badge>
        </div>
      )}
    </div>
  );
};