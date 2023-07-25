import Image from 'next/image';
import type { IMessage } from '../types/types';
import moment from 'moment';

interface IChatMessageProps {
  message: IMessage;
}

const ChatMessage = ({ message }: IChatMessageProps) => {
  if (message.isUser) {
    return (
      <div className="rounded-lg px-4 py-2 m-2 max-w-xl bg-blue-500 text-white self-end" style={{whiteSpace: 'pre-wrap'}} title={moment(message.timestamp).format('llll')}>
        {message.text}
      </div>
    );
  } else {
    return (
      <>
        <div className="rounded-lg px-4 py-2 m-2 max-w-xl bg-gray-300 text-black self-start" style={{whiteSpace: 'pre-wrap'}} title={moment(message.timestamp).format('llll')}>
          {message.text}
        </div>

        {message.images && (
          <div>
            {message.images.map((image, index) => (
              <div key={index} className="flex flex-col items-center max-w-full">
                <div className="relative w-full max-w-6xl">
                  <a href={image} target="_blank" rel="noopener noreferrer">
                    <Image
                      src={image}
                      alt="Image for user query"
                      width={800}
                      height={600}
                    />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }  
}

export default ChatMessage;
