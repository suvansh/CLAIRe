import { NextApiRequest, NextApiResponse } from 'next';
import { getMemory } from '../../../utils/utils';
import { ChromaChatMessageHistory } from '../../../services/ChromaChatMessageHistory';
import { DocumentMetadata, IMessage, Profile } from '../../../types/types';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
        return;
    }

    const { uuid, name, messageId } = req.query;
    
    const { memory } = await getMemory({ uuid: uuid as string, name: name as string });

    // get next 7 messages
    let messagesDocs: DocumentMetadata[] = (await (memory.chatHistory as ChromaChatMessageHistory).getAdjacentMessages(messageId as string, 0, 7))
    
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