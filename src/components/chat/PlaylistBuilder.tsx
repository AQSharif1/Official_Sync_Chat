import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Music, Plus, Play, ExternalLink } from 'lucide-react';

interface Song {
  id: string;
  title: string;
  artist: string;
  addedBy: string;
  addedAt: Date;
  spotifyUrl?: string;
}

interface Playlist {
  id: string;
  name: string;
  songs: Song[];
  createdAt: Date;
  collaborative: boolean;
}

interface PlaylistBuilderProps {
  playlist: Playlist;
  currentUserId: string;
  onAddSong: (songQuery: string) => void;
}

export const PlaylistBuilder = ({ playlist, currentUserId, onAddSong }: PlaylistBuilderProps) => {
  const [newSong, setNewSong] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddSong = () => {
    if (newSong.trim()) {
      onAddSong(newSong.trim());
      setNewSong('');
      setIsAdding(false);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <Card className="w-full max-w-lg mx-auto bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">{playlist.name}</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            {playlist.songs.length} songs
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Add Song Input */}
        <div className="space-y-2">
          {!isAdding ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="w-full justify-start"
            >
              <Plus className="h-3 w-3 mr-2" />
              Add a song
            </Button>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Song name, artist, or Spotify link..."
                value={newSong}
                onChange={(e) => setNewSong(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddSong()}
                className="text-sm"
                autoFocus
              />
              <Button size="sm" onClick={handleAddSong} disabled={!newSong.trim()}>
                Add
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Songs List */}
        {playlist.songs.length > 0 ? (
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {playlist.songs.map((song, index) => (
                <div
                  key={song.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-primary/10 text-xs font-medium text-primary">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{song.title}</p>
                      {song.spotifyUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => window.open(song.spotifyUrl, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{song.artist}</span>
                      <span>•</span>
                      <span>by {song.addedBy}</span>
                      <span>•</span>
                      <span>{formatTimeAgo(song.addedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No songs yet</p>
            <p className="text-xs">Add the first song to get started!</p>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
          <p className="font-medium mb-1">💡 How to add songs:</p>
          <p>• Type song name and artist: "Bohemian Rhapsody Queen"</p>
          <p>• Paste Spotify link</p>
          <p>• Use /addsong command in chat</p>
        </div>
      </CardContent>
    </Card>
  );
};

interface CreatePlaylistProps {
  onCreatePlaylist: (name: string) => void;
  onCancel: () => void;
}

export const CreatePlaylist = ({ onCreatePlaylist, onCancel }: CreatePlaylistProps) => {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (name.trim()) {
      onCreatePlaylist(name.trim());
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Music className="h-4 w-4" />
          Create Playlist
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <label className="text-xs font-medium mb-1 block">Playlist Name</label>
          <Input
            placeholder="e.g., Group Favorites, Study Vibes..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            className="text-sm"
            autoFocus
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex-1"
          >
            Create
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};