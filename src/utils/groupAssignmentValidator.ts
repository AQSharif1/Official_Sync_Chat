// Validation utilities for group assignment process
// This helps ensure data integrity and prevents assignment errors

interface UserProfile {
  username: string;
  genres: string[];
  personality: string[];
  habits: string[];
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class GroupAssignmentValidator {
  // Validate user profile data before group assignment
  static validateUserProfile(profile: UserProfile): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Username validation
    if (!profile.username || typeof profile.username !== 'string') {
      errors.push('Username is required and must be a string');
    } else if (profile.username.trim().length < 3) {
      errors.push('Username must be at least 3 characters long');
    } else if (profile.username.trim().length > 30) {
      errors.push('Username must be less than 30 characters');
    }

    // Preferences validation with null safety
    const genres = Array.isArray(profile.genres) ? profile.genres : [];
    const personality = Array.isArray(profile.personality) ? profile.personality : [];
    const habits = Array.isArray(profile.habits) ? profile.habits : [];

    if (genres.length === 0 && personality.length === 0 && habits.length === 0) {
      errors.push('At least one preference (genre, personality, or habit) is required');
    }

    // Warnings for better matching
    if (genres.length === 0) {
      warnings.push('No genres selected - this may affect group matching quality');
    }
    if (personality.length === 0) {
      warnings.push('No personality traits selected - this may affect group matching quality');
    }
    if (habits.length === 0) {
      warnings.push('No habits selected - this may affect group matching quality');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Validate array data with type safety
  static validateArrayData(data: any): string[] {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.filter(item => 
      typeof item === 'string' && 
      item.trim().length > 0
    ).map(item => item.trim());
  }

  // Sanitize user profile data
  static sanitizeUserProfile(profile: UserProfile): UserProfile {
    return {
      username: typeof profile.username === 'string' ? profile.username.trim() : '',
      genres: this.validateArrayData(profile.genres),
      personality: this.validateArrayData(profile.personality),
      habits: this.validateArrayData(profile.habits)
    };
  }

  // Calculate profile completeness score (0-100)
  static calculateProfileCompleteness(profile: UserProfile): number {
    let score = 0;
    
    // Username (30 points)
    if (profile.username && profile.username.trim().length >= 3) {
      score += 30;
    }

    // Genres (25 points)
    const genres = Array.isArray(profile.genres) ? profile.genres : [];
    if (genres.length > 0) {
      score += Math.min(25, genres.length * 5);
    }

    // Personality (25 points)
    const personality = Array.isArray(profile.personality) ? profile.personality : [];
    if (personality.length > 0) {
      score += Math.min(25, personality.length * 5);
    }

    // Habits (20 points)
    const habits = Array.isArray(profile.habits) ? profile.habits : [];
    if (habits.length > 0) {
      score += Math.min(20, habits.length * 4);
    }

    return Math.min(100, score);
  }

  // Check if profile is suitable for strict matching
  static isSuitableForStrictMatching(profile: UserProfile): boolean {
    const completeness = this.calculateProfileCompleteness(profile);
    return completeness >= 60; // At least 60% complete for good matching
  }

  // Generate fallback preferences for empty profiles
  static generateFallbackPreferences(): { genres: string[]; personality: string[]; habits: string[] } {
    return {
      genres: ['Comedy'], // Safe default genre
      personality: ['Chill'], // Safe default personality
      habits: ['Night Owl'] // Safe default habit
    };
  }
}

// Helper function for safe array operations in group matching
export const safeArrayFilter = <T>(
  sourceArray: T[] | null | undefined,
  targetArray: T[] | null | undefined,
  filterFn: (source: T, target: T) => boolean = (a, b) => a === b
): T[] => {
  const safeSource = Array.isArray(sourceArray) ? sourceArray : [];
  const safeTarget = Array.isArray(targetArray) ? targetArray : [];
  
  return safeSource.filter(sourceItem => 
    safeTarget.some(targetItem => filterFn(sourceItem, targetItem))
  );
};

// Helper function for safe preference overlap calculation
export const calculatePreferenceOverlap = (
  userPreferences: string[] | null | undefined,
  profilePreferences: string[] | null | undefined
): number => {
  const userArray = Array.isArray(userPreferences) ? userPreferences : [];
  const profileArray = Array.isArray(profilePreferences) ? profilePreferences : [];
  
  return userArray.filter(pref => profileArray.includes(pref)).length;
};