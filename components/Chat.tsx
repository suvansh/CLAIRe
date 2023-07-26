import { useEffect, useRef, FormEvent, useState } from 'react';
import ChatMessage from './ChatMessage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faTrash, faSearch, faArrowDown, faArrowUp, faHistory, faTimes } from '@fortawesome/free-solid-svg-icons';
import type { IMessage, Profile } from '../types/types';
import debounce from 'lodash.debounce';

interface IChatProps {
  messages: IMessage[];
  setMessages: React.Dispatch<React.SetStateAction<IMessage[]>>;
  newMessage: string;
  setNewMessage: (message: string) => void;
  onSendMessage: (e: FormEvent, newMessage: string) => void;
  isSubmitting: boolean;
  currentProfileRef: React.RefObject<Profile | null>;
}

const Chat = ({ messages, setMessages, newMessage, setNewMessage, onSendMessage, isSubmitting, currentProfileRef }: IChatProps) => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searchResultIndex, setSearchResultIndex] = useState<number>(0);

  // Create a ref to hold the most current messages
  const messagesRef = useRef<IMessage[]>([]);
  messagesRef.current = messages;
  // Create a ref for the search input
  const searchInputRef = useRef<HTMLDivElement | null>(null);
  // Create a ref for the Chat component container
  const messageContainerRef = useRef<HTMLDivElement | null>(null);



  const loadSearchResult = async (messageId: string): Promise<void> => {
    if (currentProfileRef.current === null) {
      // currentProfile is not set yet, so we can't make the API request.
      return;
    }
    const queryString = new URLSearchParams({
      uuid: currentProfileRef.current.uuid,
      name: currentProfileRef.current.name,
      messageId,
    }).toString();
    const res = await fetch(`/api/search/result?${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
    });
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
    }
    return;
  };

  const loadMoreMessages = async (message: IMessage | undefined, direction: "up" | "down"): Promise<IMessage[]> => {
    if (currentProfileRef.current === null) {
      // currentProfile is not set yet, so we can't make the API request.
      return [];
    }
    const res = await fetch("/api/history", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        profile: currentProfileRef.current,
        message,
        direction
      })
    });
    if (res.ok) {
      const data = await res.json();
      return data.messages;
    }
    return [];
  };


  const searchMessages = async (query: string): Promise<string[]> => {
    if (currentProfileRef.current === null) {
      // currentProfile is not set yet, so we can't make the API request.
      return [];
    }
    const queryString = new URLSearchParams({
      uuid: currentProfileRef.current.uuid,
      name: currentProfileRef.current.name,
      query,
    }).toString();
    const res = await fetch(`/api/search?${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
    });
    if (res.ok) {
      const data = await res.json();
      return data.ids;
    }
    return [];
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!searchTerm) {
      return;
    }
    const ids = await searchMessages(searchTerm);
    setSearchResults(ids);
    setSearchResultIndex(0);
    if (ids.length > 0) {
      loadSearchResult(ids[0]);
    }
  };

  const handleSearchResultNavigation = (direction: number) => {
    let newIndex = searchResultIndex + direction;
    if (newIndex >= 0 && newIndex < searchResults.length) {
      setSearchResultIndex(newIndex);
      loadSearchResult(searchResults[newIndex]);
    }
  };

  const loadHistory = async (direction: "up" | "down") => {
    const previousScrollHeight = messageContainerRef.current?.scrollHeight;
    let message = direction === 'up' ? messagesRef.current.slice(0, 1).pop() : messagesRef.current.slice(-1).pop();
    const newMessages = await loadMoreMessages(message, direction);
    if (newMessages.length === 0) {
      return;
    }
    setMessages(prevMessages => direction === 'up' ? [...newMessages, ...prevMessages] : [...prevMessages, ...newMessages]);

    requestAnimationFrame(() => {
      if (messageContainerRef.current) {
        // Check if chat window is scrollable
        if (messageContainerRef.current.scrollHeight > messageContainerRef.current.clientHeight) {
          const newScrollHeight = messageContainerRef.current.scrollHeight;
          const scrollPosition = direction === 'up' ? newScrollHeight - (previousScrollHeight || 0) : messageContainerRef.current.scrollTop;
          messageContainerRef.current.scrollTop = scrollPosition;
        } else {
          // If not scrollable, scroll to bottom
          messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
        }
      }
    });
  };

  const handleScroll = async () => {
    if (!messagesRef.current.length) {
      return;
    }
    if (messageContainerRef.current) {
      const isBottom = messageContainerRef.current.scrollHeight - messageContainerRef.current.scrollTop <= messageContainerRef.current.clientHeight + 20;
      const isTop = messageContainerRef.current.scrollTop === 0;
      if (isTop && !isLoadingMore) {
        setIsLoadingMore(true);
        await loadHistory('up');
        setIsLoadingMore(false);
      }
      else if (isBottom && !isLoadingMore) {
        setIsLoadingMore(true);
        await loadHistory('down');
        setIsLoadingMore(false);
      }
    }
  };


  const debouncedHandleScroll = debounce(handleScroll, 200);

  // effects
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

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);


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
    <div className="p-4 flex flex-col h-full justify-between">
      {/* Top controls and search */}
      <div className="flex items-center justify-between mb-2">
        {/* Load history button */}
        <button
          type="button"
          className="bg-gray-500 text-white px-3 py-1 rounded-full mr-2"
          title="Load earlier messages"
          onClick={() => loadHistory("up")}
        >
          <FontAwesomeIcon icon={faHistory} />
        </button>

        {/* Search */}
        {searchOpen ? (
          <div className="flex items-center space-x-2">
            <form onSubmit={handleSearch}>
              <input
                ref={searchInputRef as React.RefObject<HTMLInputElement>}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-2 border-gray-300 rounded-md px-2 py-1 flex-grow h-8"
                placeholder="Search (try /semantic)"
              />
            </form>
            <button
              type="button"
              className={`px-3 py-1 rounded-full mr-2 ${searchResultIndex + 1 >= searchResults.length ? 'bg-gray-400 text-gray-700' : 'bg-green-500 text-white'}`}
              title="Previous result"
              disabled={searchResultIndex + 1 >= searchResults.length}
              onClick={() => handleSearchResultNavigation(1)}
            >
              <FontAwesomeIcon icon={faArrowUp} />
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded-full mr-2 ${searchResultIndex === 0 ? 'bg-gray-400 text-gray-700' : 'bg-green-500 text-white'}`}
              title="Next result"
              disabled={searchResultIndex === 0}
              onClick={() => handleSearchResultNavigation(-1)}
            >
              <FontAwesomeIcon icon={faArrowDown} />
            </button>

            <div className="text-gray-700 dark:text-gray-200 min-w-[2rem] text-center">{searchResults.length ? searchResultIndex + 1 : 0}/{searchResults.length}</div>
            <button
              type="button"
              className="bg-red-500 text-white px-3 py-1 rounded-full"
              onClick={() => setSearchOpen(false)}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="bg-gray-500 text-white px-3 py-1 rounded-full"
            onClick={() => setSearchOpen(true)}
          >
            <FontAwesomeIcon icon={faSearch} />
          </button>
        )}
      </div>

      <hr className="border border-purple-300" />

      {/* Messages */}
      <div className="overflow-y-scroll flex-grow space-y-2 flex flex-col" ref={messageContainerRef}>
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} />
        ))}
      </div>

      {/* Message input and controls */}
      <div className="flex items-center justify-between mt-4">
        {/* Clear and send buttons */}
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
