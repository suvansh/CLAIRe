import { Chroma } from "langchain/vectorstores/chroma";
import { OpenAI } from "langchain/llms/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { ClaireMemory } from '../../services/ClaireMemory';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getMemory, getMessageCollectionName } from '../../utils/utils';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    res.status(404).end();  // Not Found
}