import path from 'path';
import { Chroma } from "langchain/vectorstores/chroma";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { AIMessage, BaseMessage, HumanMessage } from "langchain/schema";
import { ClaireMemory } from "../services/EntityVectorStoreMemory";
import { IMessage, Profile } from "../types/types";


export function getClaireDirectory(): string {
    const rootDirectory = process.cwd();
    const claireDirectory = path.join(rootDirectory, '.claire');
    return claireDirectory;
}

export function getMessageCollectionName(profile: Profile): string {
    return `${profile.uuid}-claire-message-collection`;
}

export function getEntityCollectionName(profile: Profile): string {
    return `${profile.uuid}-claire-entity-store`;
}

export async function getMemory(profile: Profile) {
    const chroma = new Chroma(new OpenAIEmbeddings(), { collectionName: getMessageCollectionName(profile) });
    const memory = await ClaireMemory.create({
        chroma: chroma,
        llm: new ChatOpenAI({ temperature: 0 }),
        entityStoreCollectionName: getEntityCollectionName(profile),
        inputKey: "input",
        humanPrefix: `${profile.name}`,
        aiPrefix: "CLAIRe",
        k: 5,
        returnDocs: false
    });
    return { chroma, memory };
}

export const messageToLangChainMessage = (message: IMessage) : BaseMessage => {
    return message.isUser ? new HumanMessage(message.text) : new AIMessage(message.text);
}