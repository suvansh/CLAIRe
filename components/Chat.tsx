import { useEffect, useRef, FormEvent, useState } from 'react';
import ChatMessage from './ChatMessage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp, faPaperPlane, faTrash } from '@fortawesome/free-solid-svg-icons';
import type { IMessage } from '../types/types';
import debounce from 'lodash.debounce';

interface IChatProps {
  messages: IMessage[];
  setMessages: React.Dispatch<React.SetStateAction<IMessage[]>>;
  newMessage: string;
  setNewMessage: (message: string) => void;
  onSendMessage: (e: FormEvent, newMessage: string) => void;
  isSubmitting: boolean;
  loadMoreMessages: (message: IMessage | undefined) => Promise<IMessage[]>;
}

const Chat = ({ messages, setMessages, newMessage, setNewMessage, onSendMessage, isSubmitting, loadMoreMessages }: IChatProps) => {
  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Create a ref to hold the most current messages
  const messagesRef = useRef<IMessage[]>([]);
  messagesRef.current = messages; // update it when messages changes

  const loadHistory = async () => {
    const previousScrollHeight = messageContainerRef.current?.scrollHeight;
    const lastMessage = messagesRef.current.slice(0, 1).pop();
    console.log("lastMessage", lastMessage);
    const newMessages = await loadMoreMessages(lastMessage);
    setMessages(prevMessages => [...newMessages, ...prevMessages]);

    requestAnimationFrame(() => {
      if (messageContainerRef.current) {
        // Check if chat window is scrollable
        if (messageContainerRef.current.scrollHeight > messageContainerRef.current.clientHeight) {
          const newScrollHeight = messageContainerRef.current.scrollHeight;
          const scrollPosition = newScrollHeight - (previousScrollHeight || 0);
          messageContainerRef.current.scrollTop = scrollPosition;
        } else {
          // If not scrollable, scroll to bottom
          messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
        }
      }
    });
  };


  const handleScroll = async () => {
    if (messageContainerRef.current) {
      const isBottom = messageContainerRef.current.scrollHeight - messageContainerRef.current.scrollTop <= messageContainerRef.current.clientHeight + 30;
      if (isBottom) {
        messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
      }
      else if (messageContainerRef.current.scrollTop === 0 && !isLoadingMore) {
        setIsLoadingMore(true);

        await loadHistory();

        setTimeout(() => {
          setIsLoadingMore(false);
        }, 3000);
      }
    }
  };

  const debouncedHandleScroll = debounce(handleScroll, 200);

  useEffect(() => {
    const scrollContainer = messageContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", debouncedHandleScroll);
      return () => {
        scrollContainer.removeEventListener("scroll", debouncedHandleScroll);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      debouncedHandleScroll.cancel();
    };
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
    <div className="border-2 border-gray-300 p-4 flex flex-col h-full justify-between relative">
      <button
        type="button"
        className="bg-gray-500 text-white px-3 py-1 rounded-full mb-2 self-center"
        title="Load more messages"
        onClick={() => loadHistory()}
      >
        <FontAwesomeIcon icon={faArrowUp} />
      </button>
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
              <FontAwesomeIcon icon={faPaperPlane} />
            </button>
          </div>
        </form>
      </div>
    </div>

  );
}

export default Chat;
