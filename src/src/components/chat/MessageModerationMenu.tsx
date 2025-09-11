import React, { useState } from 'react';
import { MoreHorizontal, Flag, Ban, VolumeX, AlertTriangle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useModeration } from '@/hooks/useModeration';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface MessageModerationMenuProps {
  messageId: string;
  authorId: string;
  chatType: 'group' | 'private';
}

const REPORT_REASONS = [
  'Hate speech or harassment',
  'Bullying or intimidation', 
  'Threats of violence',
  'Spam or unwanted content',
  'Inappropriate content',
  'Other'
];

export const MessageModerationMenu: React.FC<MessageModerationMenuProps> = ({
  messageId,
  authorId,
  chatType
}) => {
  const { user } = useAuth();
  const { blockUser, muteUser, reportMessage, loading } = useModeration();
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');

  // Don't show menu for own messages
  if (user?.id === authorId) {
    return null;
  }

  const handleBlock = async () => {
    const success = await blockUser(authorId);
    if (success) {
      toast.success('User blocked successfully');
    } else {
      toast.error('Failed to block user');
    }
  };

  const handleMute = async () => {
    const success = await muteUser(authorId);
    if (success) {
      toast.success('User muted successfully');
    } else {
      toast.error('Failed to mute user');
    }
  };

  const handleReport = () => {
    setShowReportDialog(true);
  };

  const submitReport = async () => {
    if (!reportReason) {
      toast.error('Please select a reason for reporting');
      return;
    }

    const success = await reportMessage({
      messageId,
      chatType,
      reason: reportReason,
      additionalContext: additionalContext || undefined
    });

    if (success) {
      toast.success('Message reported successfully');
      setShowReportDialog(false);
      setReportReason('');
      setAdditionalContext('');
    } else {
      toast.error('Failed to report message');
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          >
            <MoreHorizontal size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleReport} className="text-yellow-600">
            <Flag size={16} className="mr-2" />
            Report Message
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleMute} className="text-orange-600">
            <VolumeX size={16} className="mr-2" />
            Mute User
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleBlock} className="text-red-600">
            <Ban size={16} className="mr-2" />
            Block User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-yellow-500" size={20} />
              Report Message
            </DialogTitle>
            <DialogDescription>
              Help us understand what's wrong with this message.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Why are you reporting this message?
              </label>
              <div className="space-y-2">
                {REPORT_REASONS.map((reason) => (
                  <label key={reason} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="report-reason"
                      value={reason}
                      checked={reportReason === reason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="text-primary"
                    />
                    <span className="text-sm">{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Additional context (optional)
              </label>
              <Textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Provide any additional details..."
                className="min-h-20"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowReportDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={submitReport}
                disabled={loading || !reportReason}
                className="bg-red-600 hover:bg-red-700"
              >
                {loading ? 'Reporting...' : 'Submit Report'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};