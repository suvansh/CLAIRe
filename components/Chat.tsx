import { useEffect, useRef, FormEvent, useState } from 'react';
import ChatMessage from './ChatMessage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import type { IMessage } from '../types/types';

interface IChatProps {
  messages: IMessage[];
  setMessages: (messages: IMessage[]) => void;
  newMessage: string;
  setNewMessage: (message: string) => void;
  onSendMessage: (e: FormEvent, newMessage: string) => void;
  isSubmitting: boolean;
}

const Chat = ({ messages, setMessages, newMessage, setNewMessage, onSendMessage, isSubmitting }: IChatProps) => {
  const messageContainerRef = useRef<HTMLDivElement | null>(null);

  const handleScroll = () => {
    if (messageContainerRef.current) {
      // 30 is a nice middle ground for the scrollbar to follow new messages while still being able to scroll up. 50 makes it too hard to scroll up while message are coming, 20 makes it too easy for incoming messages to leave the view.
      const isBottom = messageContainerRef.current.scrollHeight - messageContainerRef.current.scrollTop <= messageContainerRef.current.clientHeight + 30;
      if (isBottom) {
        messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
      }
    }
  };

  useEffect(() => {
    handleScroll();
  }, [messages]);

  useEffect(() => {
    const scrollContainer = messageContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
      return () => {
        scrollContainer.removeEventListener("scroll", handleScroll);
      }
    }
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !newMessage) return;
    onSendMessage(e, newMessage);
    setNewMessage('');
  };

  const handleClearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="border-2 border-gray-300 p-4 flex flex-col h-full justify-between">
      <div className="overflow-y-scroll h-128 flex flex-col space-y-2" ref={messageContainerRef}>
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} />
        ))}
      </div>

      <div className="flex items-center justify-between mt-4">
        <button type="button" title="Clear conversation" className="bg-red-500 text-white px-3 py-1 rounded-md mr-2" disabled={isSubmitting} onClick={handleClearMessages}>
          <FontAwesomeIcon icon={faTrash} />
        </button>

        <form onSubmit={handleSubmit} className="flex-grow" >
          <div className="flex items-center">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="border-2 border-gray-300 rounded-md px-2 py-1 flex-grow"
              placeholder="What's on your mind?"
              style={{ minWidth: '10rem' }}
            />
            <button type="submit" className="ml-2 bg-blue-500 text-white px-3 py-1 rounded-md" disabled={isSubmitting} style={{ opacity: isSubmitting ? 0.5 : 1 }}>
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Chat;
