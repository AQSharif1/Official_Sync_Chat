import { useState } from 'react';
import { PrivateChatsList } from '@/components/reconnect/PrivateChatsList';
import { PrivateChat } from '@/components/reconnect/PrivateChat';
import { ReconnectSelection } from '@/components/reconnect/ReconnectSelection';
import { type PrivateChat as PrivateChatType } from '@/hooks/useReconnectDM';

export const ReconnectDMPage = () => {
  const [selectedChat, setSelectedChat] = useState<PrivateChatType | null>(null);
  const [showReconnectSelection, setShowReconnectSelection] = useState(false);

  if (selectedChat) {
    return (
      <PrivateChat
        chat={selectedChat}
        onBack={() => setSelectedChat(null)}
      />
    );
  }

  if (showReconnectSelection) {
    // This would typically be passed from a group selection screen
    // For now, we'll just show the list
    return (
      <div className="p-4">
        <PrivateChatsList onChatSelect={setSelectedChat} />
      </div>
    );
  }

  return (
    <div className="p-4">
      <PrivateChatsList onChatSelect={setSelectedChat} />
    </div>
  );
};