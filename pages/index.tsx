import { useState, useEffect, FormEvent, useRef } from 'react';
import Head from 'next/head';
import Chat from '../components/Chat';
import ModeButtons from '../components/ModeButtons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun, faCog, faUser } from '@fortawesome/free-solid-svg-icons';
import ProfileSwitcher from '../components/ProfileSwitcher';
import type { IMessage, Profile } from '../types/types';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';



const Home = () => {
  const [requesterId, setRequesterId] = useState<string>("");

  const [apiError, setApiError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isErrorMessageVisible, setIsErrorMessageVisible] = useState<boolean>(false);
  const [isSuccessMessageVisible, setIsSuccessMessageVisible] = useState<boolean>(false);

  const [messages, setMessages] = useState<IMessage[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [model, setModel] = useState<string>("gpt-3.5-turbo-16k");

  const [darkMode, setDarkMode] = useState<boolean>(true);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);

  const currentProfileRef = useRef(currentProfile);
  // Create a ref for the Chat component container
  const messageContainerRef = useRef<HTMLDivElement | null>(null);

  const handleSelectProfile = (profile: Profile) => {
    setCurrentProfile(profile);
    setMessages([]);
    setShowProfileSwitcher(false);
  };

  const handleProfileChange = (newProfiles: Profile[], newProfile: Profile | null, clear: boolean) => {
    setProfiles(newProfiles);
    if (newProfile === null && currentProfile?.uuid !== newProfiles[0].uuid) {
      setCurrentProfile(newProfiles[0]);
    } else if (newProfile !== null) {
      setCurrentProfile(newProfile);
    }
    if (clear) {
      setMessages([]);
    }
  };

  const scrollDownMessages = () => {
    if (messageContainerRef.current) {
      const isNearBottom = messageContainerRef.current.scrollHeight - messageContainerRef.current.scrollTop <= messageContainerRef.current.clientHeight + 80;
      if (messageContainerRef.current && isNearBottom) {
        messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
      }
    }
  };

  // effects
  useEffect(() => {
    let id = localStorage.getItem('requesterId');
    if (!id) {
      id = uuidv4();
      localStorage.setItem('requesterId', id as string);
    }

    setRequesterId(id);
  }, []);

  useEffect(() => {
    currentProfileRef.current = currentProfile;
  }, [currentProfile]);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const loadProfiles = async () => {
      const response = await fetch('/api/profiles');
      const data = await response.json();
      setProfiles(data);
      setCurrentProfile(data[0]);
    };
    loadProfiles();
  }, []);

  useEffect(() => {
    const fetchScheduledMessages = async () => {
      const res = await fetch(`/api/scheduled?uuid=${currentProfileRef.current?.uuid}&name=${currentProfileRef.current?.name}&requesterId=${requesterId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          setMessages(prevMessages => [...prevMessages, ...data.messages]);
        }
      }
    };

    // Poll every 30 seconds
    const interval = setInterval(fetchScheduledMessages, 30 * 1000);

    // Cleanup function to clear the interval when the component unmounts
    return () => clearInterval(interval);
  }, []);


  const toggleDarkMode = () => {
    setDarkMode(prevDarkMode => !prevDarkMode);
  };

  const setTempApiError = (message: string, timeoutSeconds: number = 5) => {
    setApiError(message);
    setIsErrorMessageVisible(true);

    setTimeout(() => {
      setIsErrorMessageVisible(false); // Hide the error message after 5 seconds
    }, timeoutSeconds * 1000);
  };

  const setTempSuccessMessage = (message: string, timeoutSeconds: number = 5) => {
    setSuccessMessage(message);
    setIsSuccessMessageVisible(true);

    setTimeout(() => {
      setIsSuccessMessageVisible(false); // Hide the error message after 5 seconds
    }, timeoutSeconds * 1000);
  };

  const handleSubmit = async (e: FormEvent, incomingMessage: string) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      const payload = {
        history: messages.slice(-20),
        input: incomingMessage,
        model: model,
        profile: currentProfileRef.current,
        requesterId: requesterId
      };

      const updatedMessages = [...messages, { id: uuidv4(), text: incomingMessage, isUser: true, images: [], timestamp: moment().valueOf() }];
      setMessages(updatedMessages);
      scrollDownMessages();

      const res = await fetch('/api/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });
      if (!res.body || !res.ok) {
        setMessages(prevMessages => prevMessages.slice(0, -1));
        setTempApiError('An error occurred while processing your query.');
        setNewMessage(incomingMessage); // reset the message input
      } else {
        setMessages([...updatedMessages, {
          id: uuidv4(),
          text: "",
          isUser: false,
          images: [],
          timestamp: moment().valueOf()
        }]);
        const reader = res.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = new TextDecoder().decode(value);
          setMessages((prevMessages) => {
            const lastMessage = prevMessages[prevMessages.length - 1];
            const updatedLastMessage = { ...lastMessage, text: lastMessage.text + text };
            return [...prevMessages.slice(0, -1), updatedLastMessage];
          });
          scrollDownMessages();
        }
      }

    } catch (err) {
      console.log(err);
      setMessages(prevMessages => prevMessages.slice(0, -1));
      setTempApiError('An error occurred while processing your query.');
      setNewMessage(incomingMessage); // reset the message input
    } finally {
      setIsSubmitting(false); // End submission regardless of success or failure
    }

  };

  return (
    <>
      <Head>
        <title>CLAIRe: Conversational Learning AI with Recall.</title>
      </Head>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div
          className="flex flex-col w-full max-w-7xl bg-white dark:bg-gray-800 shadow-md rounded px-8 pt-6 pb-8 mb-4 overflow-auto"
          style={{ height: '98vh' }}
        >
          <div className="relative">
            <h1
              className="text-6xl font-bold text-center pb-2"
              style={{
                fontFamily: 'Quicksand',
                fontWeight: 'bold',
                backgroundImage: 'linear-gradient(135deg, #CB5EEE 0%, #4BE1EC 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              <span title="CLAIRe: Conversational Learning AI with Recall">
                <button
                  className="focus:outline-none"
                  onClick={toggleDarkMode}
                  style={{ color: '#B67EEF' }}
                >
                  <FontAwesomeIcon icon={darkMode ? faSun : faMoon} />
                </button>LAIRe
              </span>
            </h1>
            <div className="absolute top-0 right-0 mt-2 mr-2 flex items-center space-x-2">
              <button className="dark:text-gray-200 text-gray-700 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded flex items-center" onClick={() => setShowProfileSwitcher(true)}>
                <FontAwesomeIcon icon={faUser} />
                <span className="ml-1">{currentProfile?.name ?? ""}</span>
              </button>
            </div>
            {showProfileSwitcher && (
              <ProfileSwitcher
                profiles={profiles}
                onClose={() => setShowProfileSwitcher(false)}
                onSelectProfile={handleSelectProfile}
                onProfileChange={handleProfileChange}
              />
            )}
          </div>

          <div className="pl-4 text-center">
            <a className="github-button" href="https://github.com/suvansh" data-color-scheme="no-preference: dark; light: light; dark: dark;" aria-label="Follow @suvansh on GitHub">Follow @suvansh</a>
            <a className="github-button" href="https://github.com/suvansh/CLAIRe" data-color-scheme="no-preference: dark; light: light; dark: dark;" aria-label="Star suvansh/CLAIRe on GitHub">Star</a>
          </div>
          <p className="text-center text-gray-700 dark:text-gray-200 pb-2">Read about how it works <a target="_blank" href="https://www.brilliantly.ai/blog/claire">here</a>.</p>
          <form className="w-full max-w-7xl bg-white dark:bg-gray-800 shadow-md rounded px-8 pt-6 pb-8 mb-4 text-center">
            <ModeButtons
              options={[{ name: 'GPT-4', value: 'gpt-4' }, { name: 'GPT-3.5', value: 'gpt-3.5-turbo-16k' }]}
              tooltipContent="GPT-3.5 is ~5x faster and 15x cheaper than GPT-4."
              selectedOption={model}
              onOptionChange={setModel}
            />
            <div className="flex items-center justify-between">
              {apiError && isErrorMessageVisible && <p className="text-red-500 dark:text-red-400">{apiError}</p>}
              {successMessage && isSuccessMessageVisible && <p className="text-green-500 dark:text-green-400">{successMessage}</p>}
            </div>
          </form>
          <div className="flex flex-grow overflow-auto">
            <div className="w-full overflow-auto" style={{ maxHeight: `calc(98vh - 100px)` }}>
              <Chat
                messages={messages}
                setMessages={setMessages}
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                onSendMessage={handleSubmit}
                isSubmitting={isSubmitting}
                currentProfileRef={currentProfileRef}
                messageContainerRef={messageContainerRef}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
