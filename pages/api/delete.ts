import { Chroma } from "langchain/vectorstores/chroma";
import { OpenAI } from "langchain/llms/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { EntityVectorStoreMemory } from '../../services/EntityVectorStoreMemory';
import type { NextApiRequest, NextApiResponse } from 'next';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = req.body.user;
    const chroma = new Chroma(new OpenAIEmbeddings(), { collectionName: `${user}-claire-message-collection` });
    const memory = await EntityVectorStoreMemory.create({
        vectorStoreRetriever: chroma.asRetriever(8),
        llm: new OpenAI({ temperature: 0 }),
        entityStoreCollectionName: `${user}-claire-entity-collection`,
        inputKey: "input",
        k: 8,
        returnDocs: false });
    await memory.clear();
    await chroma.ensureCollection();
    if (chroma.index) {
        await chroma.index?.deleteCollection({ name: `${user}-claire-message-collection` });
        res.status(200).json({ message: 'Data cleared successfully.' });
    }
    else {
        res.status(500).json({ message: 'Error clearing data.' });
    }    
}