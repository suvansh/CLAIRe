import type { NextApiRequest, NextApiResponse } from 'next';
import { getScheduledMessages, removeSentMessages } from '../../utils/messageUtils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  if (!req.query.user) {
    return res.status(400).json({ message: 'Invalid request body' });
  }

  const user = req.query.user as string;

  const scheduledMessages = getScheduledMessages(user);
  console.log("scheduledMessages:", scheduledMessages);

  // Remove the sent messages after they've been fetched
  const sentMessageIds = scheduledMessages.map((message) => message.id);
  console.log("sentMessageIds:", sentMessageIds);
  removeSentMessages(user, sentMessageIds);

  res.json({ messages: scheduledMessages });
}
