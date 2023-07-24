import { BaseEntityStore } from "langchain/schema";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Chroma } from "langchain/vectorstores/chroma";
import { Document } from "langchain/document";
import { IncludeEnum, Metadata } from "chromadb/src/types"
import type { ChromaClient, Collection } from "chromadb";
import type { DocumentMetadata } from "../types/types";
import moment from "moment";


const DEFAULT_SIMILARITY_K: number = 3;

export default class ChromaEntityStore extends BaseEntityStore {
    lc_namespace = []; // needed to extend BaseEntityStore but not used

    private store: Chroma;
    private collectionName: string;
    private collection: Collection;
    private chromaClient: ChromaClient | undefined;
    private limit: number | undefined;

    private constructor(chromaCollection: string, store: Chroma, collection: Collection, limit: number | undefined) {
        super();
        this.collectionName = chromaCollection;
        this.store = store;
        this.collection = collection;
        this.chromaClient = this.store.index;
        this.limit = limit;
    }

    static async create(chromaCollection: string, limit: number | undefined = undefined): Promise<ChromaEntityStore> {
        const collectionName = chromaCollection;
        const store = new Chroma(new OpenAIEmbeddings(), { collectionName });
        const collection = await store.ensureCollection();
        return new ChromaEntityStore(chromaCollection, store, collection, limit);
    }

    static getEntityStringFromDocs(docs: DocumentMetadata[]): string {
        const documents = docs.map(({ document }) => document);
        const metadatas = docs.map(({ metadata }) => metadata);
        return ChromaEntityStore.getEntityString(documents, metadatas);
    }

    static getEntityString(documents: (string | null)[], metadatas: (Metadata | null)[]): string {
        return documents.map((doc, i) => {
            if (!doc) return "";
            const metadata = metadatas?.[i];
            const created = metadata?.created ? moment(metadata.created as number).format("ddd MM/DD/YYYY HH:mm Z") : "(unknown date)";
            return `${created}: ${doc}`;
        }).join("\n");
    }

    async get(
        key: string,
        defaultValue: string | undefined,
        limit: number | undefined = undefined
    ): Promise<string | undefined> {
        const documentMetadatas = await this.getDocs(key, limit ?? this.limit);
        return documentMetadatas.length === 0 ? defaultValue : ChromaEntityStore.getEntityStringFromDocs(documentMetadatas);
    }

    /*
    * Get the most recent limit docs for the given key 
    */
    async getDocs(
        key: string,
        limit: number | undefined = undefined
    ): Promise<DocumentMetadata[]> {
        // docs with the same entityName
        const entityResults = await this.collection.get({
            where: { "entityName": key },
            include: ["documents", "metadatas"] as IncludeEnum[]
        });
        // order entityResults by created metadata field
        if (entityResults.documents && entityResults.metadatas) {
            const docsAndMetadatas = entityResults.documents.map((document, i) => {
                return { document, id: entityResults.ids[i], metadata: entityResults.metadatas[i] };
            });
            docsAndMetadatas.sort((a, b) => {
                const aDate = a.metadata?.created ? moment(a.metadata.created as number).unix() : 0;
                const bDate = b.metadata?.created ? moment(b.metadata.created as number).unix() : 0;
                return aDate - bDate;
            });
            // get the most recent limit docs
            const docsAndMetadatasLimited = limit ? docsAndMetadatas.slice(-limit) : docsAndMetadatas;
            return docsAndMetadatasLimited;
        }
        return [];
    }

    async set(key: string, value: string | undefined): Promise<void> {
        if (!value) return;
        await this.store.addDocuments([new Document({
            pageContent: value,
            metadata: {
                entityName: key,
                created: moment().unix()
            }
        })]);
    }

    async delete(key: string): Promise<void> {
        await this.collection.delete({
            where: { "entityName": key }
        });
    }

    async exists(key: string): Promise<boolean> {
        const entityResults = await this.collection.get({
            where: { "entityName": key },
            limit: 1,
            include: ["documents"] as IncludeEnum[]
        });
        return entityResults.documents && entityResults.documents.length > 0;
    }

    async clear(): Promise<void> {
        await this.chromaClient?.deleteCollection({
            name: this.collectionName
        });
        this.store = new Chroma(new OpenAIEmbeddings(), { collectionName: this.collectionName });
        this.chromaClient = this.store.index;
        this.collection = await this.store.ensureCollection();
    }

    async getBySimilarity(query: string, limit: number | undefined = undefined): Promise<Record<string, DocumentMetadata[]>> {
        const chromaResults = await this.collection.query({
            queryEmbeddings: await this.store.embeddings.embedQuery(query),
            nResults: limit ?? this.limit ?? DEFAULT_SIMILARITY_K
        });
        if (!chromaResults.ids[0]) {
            return {};
        }
        const results = chromaResults.ids[0].map((id, i) => {
            return {
                id: id,
                document: chromaResults.documents[0][i],
                metadata: chromaResults.metadatas[0][i]
            };
        });
        const groupedResults = results.reduce((acc, doc) => {
            const entityName = String(doc.metadata?.entityName);
            if (entityName) {
                acc[entityName] = [...(acc[entityName] ?? []), doc];
            }
            return acc;
        }, {} as { [key: string]: DocumentMetadata[] });
        return groupedResults;
    }
}