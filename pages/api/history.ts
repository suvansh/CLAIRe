import { NextApiRequest, NextApiResponse } from 'next';
import { getMemory } from '../../utils/utils';
import { ChromaChatMessageHistory } from '../../services/ChromaChatMessageHistory';
import { DocumentMetadata, IMessage, Profile } from '../../types/types';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const { profile, message } = req.body;

  const { memory } = await getMemory(profile);
  // get previous 8 messages
  let messagesDocs: DocumentMetadata[] = (await (memory.chatHistory as ChromaChatMessageHistory).getAdjacentMessages(message, 8, 0))
  if (message) {
    // exclude the message we're getting history for
    // if message is null we're getting the most recent messages so don't need to exclude anything
    messagesDocs = messagesDocs.slice(0, -1);
  }

  const messages: IMessage[] = messagesDocs.map((doc) => {
    return {
        id: (doc.metadata?.id as string) ?? "",
        text: doc.document ?? "",
        isUser: (doc.metadata?.isUser as boolean) ?? false,
        images: [],
        timestamp: (doc.metadata?.timestamp as number) ?? 0
    };
  });

  res.status(200).json({ messages });
}