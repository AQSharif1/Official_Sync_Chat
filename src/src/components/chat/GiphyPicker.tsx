import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Image, Search, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GifData {
  id: string;
  title: string;
  images: {
    fixed_height: {
      url: string;
      width: string;
      height: string;
    };
  };
}

interface GiphyPickerProps {
  onGifSelect: (gifUrl: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export const GiphyPicker = ({ onGifSelect, disabled = false, compact = false }: GiphyPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY;
  const GIPHY_BASE_URL = 'https://api.giphy.com/v1/gifs';

  useEffect(() => {
    if (isOpen && gifs.length === 0 && !searchTerm) {
      loadTrendingGifs();
    }
  }, [isOpen]);

  const loadTrendingGifs = async () => {
    if (!GIPHY_API_KEY) {
      setError('GIPHY API key not configured');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${GIPHY_BASE_URL}/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch trending GIFs');
      }
      
      const data = await response.json();
      setGifs(data.data || []);
    } catch (err) {
      console.error('Error loading trending GIFs:', err);
      setError('Failed to load GIFs. Please try again.');
      setGifs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!GIPHY_API_KEY) {
      setError('GIPHY API key not configured');
      return;
    }

    if (!searchTerm.trim()) {
      loadTrendingGifs();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${GIPHY_BASE_URL}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchTerm)}&limit=20&rating=g`
      );
      
      if (!response.ok) {
        throw new Error('Search request failed');
      }
      
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error('Error searching GIFs:', error);
      setError('Search failed. Please try again.');
      setGifs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGifSelect = (gif: any) => {
    onGifSelect(gif.images.fixed_height.url);
    setIsOpen(false);
    setSearchTerm('');
  };

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Search GIFs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} size="sm" disabled={loading}>
            <Search className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
          {loading ? (
            <div className="col-span-2 flex items-center justify-center py-8">
              <LoadingSpinner text="Loading GIFs..." />
            </div>
          ) : error ? (
            <div className="col-span-2 text-center py-8 text-destructive">
              {error}
            </div>
          ) : gifs.length > 0 ? (
            gifs.map((gif) => (
              <div
                key={gif.id}
                className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                onClick={() => handleGifSelect(gif)}
              >
                <img
                  src={gif.images.fixed_height?.url || gif.images.preview_gif?.url}
                  alt={gif.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-8 text-muted-foreground">
              No GIFs found
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-10 w-10 p-0 rounded-full hover-scale"
        >
          <Image className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" side="top">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search GIFs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} size="sm" disabled={loading}>
              Search
            </Button>
          </div>
        </div>
        
        <ScrollArea className="h-64">
          <div className="grid grid-cols-2 gap-2 p-4">
            {loading ? (
              <div className="col-span-2 flex items-center justify-center py-8">
                <LoadingSpinner text="Loading GIFs..." />
              </div>
            ) : error ? (
              <div className="col-span-2 text-center py-8 text-destructive">
                {error}
              </div>
            ) : gifs.length > 0 ? (
              gifs.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => handleGifSelect(gif)}
                  className="aspect-square rounded-md overflow-hidden hover:opacity-80 transition-opacity"
                >
                  <img
                    src={gif.images.fixed_height.url}
                    alt={gif.title}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))
            ) : (
              <div className="col-span-2 text-center py-8 text-muted-foreground">
                No GIFs found. Try a different search term.
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};