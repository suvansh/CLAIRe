import { Chroma } from "langchain/vectorstores/chroma";
import { OpenAI } from "langchain/llms/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { ClaireMemory } from '../../services/EntityVectorStoreMemory';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getMemory, getMessageCollectionName } from '../../utils/utils';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const profile = req.body.profile;
    const { chroma, memory } = await getMemory(profile);
    await memory.clear();
    res.status(200).json({ message: 'Data cleared successfully.' });
}