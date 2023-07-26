import { BaseChatMessageHistory, BaseMessage, HumanMessage, AIMessage } from "langchain/schema";
import { VectorStoreRetriever } from "langchain/vectorstores/base";
import { Chroma } from "langchain/vectorstores/chroma";
import { Document } from "langchain/document";
import type { ChromaClient, Collection } from "chromadb";
import moment from "moment";
import { DocumentMetadata, IMessage } from "@/types/types";
import { IncludeEnum, type Where } from "chromadb/dist/main/types.js";

export class ChromaChatMessageHistory extends BaseChatMessageHistory {
    lc_namespace = []  // needed to extend BaseChatMessageHistory but not used

    store: VectorStoreRetriever;
    chroma: Chroma;
    collection: Collection;
    currentId: number;

    private constructor(chroma: Chroma, collection: Collection, k: number = 5) {
        super();
        this.chroma = chroma;
        this.collection = collection;
        this.store = chroma.asRetriever(k);
        this.currentId = 0;
    }

    static async create(chroma: Chroma, k: number = 5): Promise<ChromaChatMessageHistory> {
        const collection = await chroma.ensureCollection();
        const instance = new ChromaChatMessageHistory(chroma, collection, k);
        instance.currentId = await collection.count(); // Set the current ID to the current count of the collection
        return instance;
    }

    async getMessages(): Promise<BaseMessage[]> {
        const messageDocs = await this.getAllMessageDocs();
        return messageDocs.map(({ document, metadata }) => {
            return metadata?.isUser ? new HumanMessage(document ?? "") : new AIMessage(document ?? "");
        }).filter(message => message !== null);
    }

    async addUserMessage(message: string) {
        return;
    }

    async addAIChatMessage(message: string) {
        return;
    }

    async getAllMessageDocs(): Promise<DocumentMetadata[]> {
        const getResponse = await this.collection.get({
            include: [IncludeEnum.Documents, IncludeEnum.Metadatas]
        });
        if (getResponse.documents && getResponse.metadatas) {
            return getResponse.documents.map((document, i) => {
                return { document, id: getResponse.ids[i], metadata: getResponse.metadatas[i] };
            });
        }
        return [];
    }

    async searchMessagesSemantic(query: string, numResults: number = 10): Promise<DocumentMetadata[]> {
        const queryResponse = await this.collection.query({
            queryEmbeddings: await this.chroma.embeddings.embedQuery(query),
            nResults: numResults,
            include: [IncludeEnum.Documents, IncludeEnum.Metadatas]
        });
        // [0] because it's the response to the first (and in this case only) query
        if (queryResponse.documents[0] && queryResponse.metadatas[0]) {
            return queryResponse.documents[0].map((document, i) => {
                return { document, id: queryResponse.ids[0][i], metadata: queryResponse.metadatas[0][i] };
            });
        }
        return [];
    }

    async searchMessagesExact(query: string, numResults: number = 10): Promise<DocumentMetadata[]> {
        const getResponse = await this.collection.get({
            whereDocument: { $contains: query },
            limit: numResults,
            include: [IncludeEnum.Documents, IncludeEnum.Metadatas]
        });
        if (getResponse.documents && getResponse.metadatas) {
            return getResponse.documents.map((document, i) => {
                return { document, id: getResponse.ids[i], metadata: getResponse.metadatas[i] };
            });
        }
        return [];
    }

    async getAdjacentMessages(
        message: DocumentMetadata | IMessage | string | undefined,
        prevMessages: number = 4,
        nextMessages: number = 5
    ): Promise<DocumentMetadata[]> {
        let id: number;
        if (message === undefined) {
            id = await this.collection.count() - 1;
        } else if ((message as IMessage).isUser !== undefined) { // message is IMessage
            const messageI = message as IMessage;
            const timestampMoment = moment(messageI.timestamp);

            const getResponse = await this.collection.get({
                include: [IncludeEnum.Documents, IncludeEnum.Metadatas],
                where: {
                    "$and": [
                        {
                            "timestamp": {
                                "$eq": timestampMoment.valueOf()
                            }
                        },
                        {
                            "isUser": {
                                "$eq": messageI.isUser ? 1 : 0
                            }
                        }
                    ]
                }
            });

            if (getResponse.ids && getResponse.ids.length > 0) {
                // match messageI.text to document
                // then sort by distance of timestamp from metadata from reference value messageI.timestamp
                // then take the closest one
                const matchingText = getResponse.ids.filter((id_, i) => {
                    return getResponse.documents[i] === messageI.text;
                });
                if (matchingText.length === 0) {
                    return [];
                }
                id = +matchingText.map((id_, i): [string, number] => {
                    return [id_, Math.abs((getResponse.metadatas[i]?.timestamp ?? 0) as number - messageI.timestamp)];
                }).sort((a, b) => {
                    return a[1] - b[1];
                })[0][0];
            } else {
                return [];
            }
        } else if (typeof message === "string") {  // message is id
            id = parseInt(message);
            if (isNaN(id)) {
                return [];
            }
        } else {  // message is DocumentMetadata
            id = parseInt(message.id);
            if (isNaN(id)) {
                return [];
            }
        }
        
        const adjacentIds: string[] = [];
        for (let i = id - prevMessages; i <= id + nextMessages; i++) {
            adjacentIds.push(i.toString());
        }
        const getResponse = await this.collection.get({
            ids: adjacentIds,
            include: [IncludeEnum.Documents, IncludeEnum.Metadatas]
        });
        if (getResponse.documents && getResponse.metadatas) {
            return getResponse.documents.map((document, i) => {
                return { document, id: getResponse.ids[i], metadata: getResponse.metadatas[i] };
            }).sort((a, b) => {
                return parseInt(a.id) - parseInt(b.id);
            });
        }
        return [];
    }

    async checkUnique(message: string, timestamp: number, isUser: boolean) : Promise<boolean> {
        const timestampMoment = moment(timestamp);
        const getResponse = await this.collection.get({
            whereDocument: { $contains: message },
            where: {
                "$and": [
                    {
                        "timestamp": {
                            "$eq": timestampMoment.valueOf()
                        }
                    },
                    {
                        "isUser": {
                            "$eq": isUser ? 1 : 0
                        }
                    }
                ]
            }
        });
        if (getResponse.documents && getResponse.documents.length > 0) {
            return false;
        }
        return true;
    }

    /* This is the method to use to add a user message to the chat history. Metadata includes all data from IMessage interface */
    async addUserMessageMetadata(message: string, metadata: Record<string, any>): Promise<void> {
        if (await this.checkUnique(message, metadata.timestamp, true)) {
            await this.chroma.addDocuments(
                [new Document({ pageContent: message, metadata: { isUser: true, ...metadata } })],
                { ids: [`${this.currentId++}`] }
            )
        }
    }

    /* This is the method to use to add an AI message to the chat history. Metadata includes all data from IMessage interface */
    async addAIChatMessageMetadata(message: string, metadata: Record<string, any>): Promise<void> {
        if (await this.checkUnique(message, metadata.timestamp, false)) {
            await this.chroma.addDocuments(
                [new Document({ pageContent: message, metadata: { isUser: false, ...metadata } })],
                { ids: [`${this.currentId++}`] }
            )
        }
    }

    async clear(): Promise<void> {
        if (!this.chroma.index) return;
        const collectionName = this.collection.name;
        await this.chroma.index.deleteCollection({ name: collectionName });
        await this.chroma.index.createCollection({ name: collectionName });
        this.collection = await this.chroma.ensureCollection();
        this.currentId = 0;
    }
}
