import type { NextApiRequest, NextApiResponse } from 'next';
import { getScheduledMessages, removeSentMessages } from '../../lib/scheduled';
import { getMemory } from '../../utils/utils';
import { ChromaChatMessageHistory } from '../../services/ChromaChatMessageHistory';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const { uuid: uuidRaw, name } = req.query;
  const uuid = uuidRaw as string;

  const { memory } = await getMemory({ uuid: uuid, name: name as string });

  const scheduledMessages = getScheduledMessages(uuid);

  // Add the sent messages to chat history
  for (const message of scheduledMessages) {
    const { text, id, isUser, images, timestamp } = message;
    (memory.chatHistory as ChromaChatMessageHistory).addAIChatMessageMetadata(text, { id, isUser, images, timestamp });
  }

  // Remove the sent messages
  const sentMessageIds = scheduledMessages.map((message) => message.id);
  removeSentMessages(uuid, sentMessageIds);

  res.json({ messages: scheduledMessages });
}
