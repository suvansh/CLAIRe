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

    const { uuid, name, query: rawQuery } = req.query;
    const query = rawQuery as string;

    const { memory } = await getMemory({ uuid: uuid as string, name: name as string });

    // check if query starts with "/semantic"
    let results: DocumentMetadata[] = [];
    if (query.startsWith("/semantic")) {
        // get the query without the "/semantic" prefix
        let semanticQuery = query.substring("/semantic".length).trim();
        // regex to match numbers in curly braces (e.g. "/semantic {3} my search term" should match 3)
        const numRegex = /\{\s*(\d+)\s*\}/;
        // get the number of results to return
        const numResults = parseInt(semanticQuery.match(numRegex)?.[1] ?? "10");
        // remove the number from the query
        semanticQuery = semanticQuery.replace(numRegex, "").trim();
        // search for messages
        results = await (memory.chatHistory as ChromaChatMessageHistory).searchMessagesSemantic(semanticQuery, numResults);
    } else {
        results = await (memory.chatHistory as ChromaChatMessageHistory).searchMessagesExact(query, 500);
    }

    results.sort((a, b) => parseInt(b.id) - parseInt(a.id));  // sort by id descending (recent first)

    const messages: IMessage[] = results.map((doc) => {
        return {
            id: (doc.metadata?.id as string) ?? "",
            text: doc.document ?? "",
            isUser: (doc.metadata?.isUser as boolean) ?? false,
            images: [],
            timestamp: (doc.metadata?.timestamp as number) ?? 0
        };
    });
    const ids: string[] = results.map((doc) => doc.id);

    res.status(200).json({ ids });
}