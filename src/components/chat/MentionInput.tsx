import { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GroupMember } from '@/hooks/useMentions';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyPress?: (e: React.KeyboardEvent) => void;
  onTyping?: () => void;
  members: GroupMember[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const MentionInput = ({
  value,
  onChange,
  onKeyPress,
  onTyping,
  members,
  placeholder,
  disabled,
  className
}: MentionInputProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<GroupMember[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    onTyping?.();

    // Check for @ mentions
    const cursorPos = e.target.selectionStart;
    const textUpToCursor = newValue.slice(0, cursorPos);
    const mentionMatch = textUpToCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      const start = cursorPos - mentionMatch[0].length;
      setMentionStart(start);
      
      const filteredMembers = members.filter(member =>
        member.username.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5);
      
      setSuggestions(filteredMembers);
      setShowSuggestions(filteredMembers.length > 0);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
      setMentionStart(-1);
    }
  };

  const insertMention = (member: GroupMember) => {
    if (mentionStart === -1 || !textareaRef.current) return;

    const before = value.slice(0, mentionStart);
    const after = value.slice(textareaRef.current.selectionStart);
    const newValue = `${before}@${member.username} ${after}`;
    
    onChange(newValue);
    setShowSuggestions(false);
    setSuggestions([]);
    setMentionStart(-1);

    // Focus back to textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionStart + member.username.length + 2;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % suggestions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
          break;
        case 'Enter':
          if (!e.shiftKey) {
            e.preventDefault();
            insertMention(suggestions[selectedIndex]);
            return;
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowSuggestions(false);
          setSuggestions([]);
          setMentionStart(-1);
          break;
      }
    }

    onKeyPress?.(e);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSuggestions(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        rows={1}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute bottom-full left-0 right-0 mb-2 z-10 max-h-40 overflow-y-auto">
          <div className="p-1">
            {suggestions.map((member, index) => (
              <Button
                key={member.userId}
                variant={index === selectedIndex ? "secondary" : "ghost"}
                className="w-full justify-start text-left h-8"
                onClick={() => insertMention(member)}
              >
                @{member.username}
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};