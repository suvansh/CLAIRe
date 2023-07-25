import type { NextApiRequest, NextApiResponse } from 'next';
import type { IMessage, Profile } from '../../types/types';

import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { OpenAI } from "langchain/llms/openai";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { Chroma } from "langchain/vectorstores/chroma";
import { ConversationChain } from "langchain/chains";
import { EntityMemory, VectorStoreRetrieverMemory, getBufferString } from "langchain/memory";
import { PromptTemplate } from "langchain/prompts";

import moment, { Moment } from 'moment';

import { CLAIRE_ENTITY_MEMORY_CONVERSATION_TEMPLATE, CLAIRE_CHROMA_MEMORY_CONVERSATION_TEMPLATE, CLAIRE_MEMORY_CONVERSATION_TEMPLATE } from "../../prompts/memory";
import { VectorStoreChatMemory } from '../../services/VectorStoreChatMemory';
import { ClaireMemory } from '../../services/EntityVectorStoreMemory';
import { DEFAULT_PROFILE } from '../../lib/consts';
import { writeMessageToFile } from '../../utils/scheduledMessageUtils';
import { v4 as uuidv4 } from 'uuid';
import { config } from 'dotenv';
import { AIMessage, HumanMessage } from 'langchain/schema';
import { CLAIRE_SCHEDULE_MESSAGE_TEMPLATE, scheduledMessageParser } from '../../prompts/scheduledMessages';
import { getMemory, messageToLangChainMessage } from '../../utils/utils';

// Load environment variables from .env file
config({ path: '.env.local' });


const gptProps = {
    temperature: 0.9,
    streaming: true
}
function getStreamingCbs(res: NextApiResponse) {
    return [
        {
            handleLLMNewToken(token: any) {
                res.write(token);
            }
        }
    ]
}


async function respondNow(input: string, history: IMessage[], datetime: Moment, chroma: Chroma, memory: ClaireMemory, chat: ChatOpenAI, profile: Profile, res: NextApiResponse): Promise<string> {
    const datetimeString = datetime.format("ddd MM/DD/YYYY HH:mm Z");
    const chain = new ConversationChain({
        memory: memory,
        prompt: CLAIRE_MEMORY_CONVERSATION_TEMPLATE,
        llm: chat,
    });
    const response = await chain.predict({ input: input, user: profile.name, datetime: datetimeString, history: history.map(messageToLangChainMessage) });
    // const formattedPrompt = CLAIRE_MEMORY_CONVERSATION_TEMPLATE.format({ input: input, user: user, datetime: datetimeString, history: history.map(messageToLangChainMessage) });
    // console.log("Memory inspection:\n",
    //              await memory.loadMemoryVariables({ input: input, user: user, datetime: datetimeString, history: history.map(messageToLangChainMessage) }));
    return response;
}

async function respondLater(input: string, history: IMessage[], responseNow: string, datetime: Moment, chroma: Chroma, memory: ClaireMemory, model: string, profile: Profile) {
    const serializedMessages = getBufferString(
        history.slice(-3 * 2).map((message) => message.isUser ? new HumanMessage(message.text) : new AIMessage(message.text)),
        memory.humanPrefix ?? "Human",
        memory.aiPrefix ?? "You"
    );
    const llm = new ChatOpenAI({ temperature: 0.5, modelName: model == "gpt-4" ? "gpt-4" : "gpt-3.5-turbo" });
    const datetimeString = datetime.format("ddd MM/DD/YYYY HH:mm");
    const formattedPrompt = await CLAIRE_SCHEDULE_MESSAGE_TEMPLATE.format({
        input: input,
        response: responseNow,
        user: profile.name,
        history: serializedMessages,
        datetime: datetimeString,
        humanPrefix: memory.humanPrefix ?? "Human",
        aiPrefix: memory.aiPrefix ?? "You"
    });
    const response = await llm.call([new HumanMessage(formattedPrompt)]);
    const parsedResponse = await scheduledMessageParser.parse(response.content);
    if (!parsedResponse.scheduledMessage) {
        return;
    }
    const timestamp = moment(`${parsedResponse.date} ${parsedResponse.time}`, "MM/DD/YYYY HH:mm").valueOf();
    const scheduledMessage = { id: uuidv4(), isUser: false, text: parsedResponse.scheduledMessage, images: [], timestamp: timestamp };
    writeMessageToFile(profile.uuid, scheduledMessage);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const datetime = moment();
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    if (!req.body.input) {
        return res.status(400).json({ message: 'Invalid request body' });
    }

    const history: IMessage[] = req.body.history;
    const input: string = req.body.input;
    const model: string = req.body.model || 'gpt-3.5-turbo-16k';
    const profile: Profile = req.body.profile;

    const { chroma, memory } = await getMemory(profile);
    const cbs = getStreamingCbs(res);
    const gpt35 = new ChatOpenAI({ ...gptProps, modelName: "gpt-3.5-turbo-16k", callbacks: cbs });
    const gpt4 = new ChatOpenAI({ ...gptProps, modelName: "gpt-4", callbacks: cbs });
    const chat = model == "gpt-4" ? gpt4 : gpt35;

    const responseNow = await respondNow(input, history, datetime, chroma, memory, chat, profile, res);
    res.end();
    await respondLater(input, history, responseNow, datetime, chroma, memory, model, profile);
}
