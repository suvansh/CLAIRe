import { PromptTemplate } from "langchain/prompts";

export const _DEFAULT_ENTITY_EXTRACTION_TEMPLATE = `You are an AI assistant reading the transcript of a conversation between an AI and a human. Extract all of the proper nouns from the last line of conversation. As a guideline, a proper noun is generally capitalized. You should definitely extract all names and places.

The conversation history is provided just in case of a coreference (e.g. "What do you know about him" where "him" is defined in a previous line) -- ignore items mentioned there that are not in the last line.

Return the output as a single comma-separated list, or NONE if there is nothing of note to return (e.g. the user is just issuing a greeting or having a simple conversation).

EXAMPLE
Conversation history:
Person #1: my name is Jacob. how's it going today?
AI: "It's going great! How about you?"
Person #1: good! busy working on Langchain. lots to do.
AI: "That sounds like a lot of work! What kind of things are you doing to make Langchain better?"
Last line:
Person #1: i'm trying to improve Langchain's interfaces, the UX, its integrations with various products the user might want ... a lot of stuff.
Output: Jacob,Langchain
END OF EXAMPLE

EXAMPLE
Conversation history:
Person #1: how's it going today?
AI: "It's going great! How about you?"
Person #1: good! busy working on Langchain. lots to do.
AI: "That sounds like a lot of work! What kind of things are you doing to make Langchain better?"
Last line:
Person #1: i'm trying to improve Langchain's interfaces, the UX, its integrations with various products the user might want ... a lot of stuff. I'm working with Person #2.
Output: Langchain, Person #2
END OF EXAMPLE

Conversation history (for reference only):
{history}
Last line of conversation (for extraction):
Human: {input}

Output:`;

export const ENTITY_EXTRACTION_PROMPT = new PromptTemplate({
  inputVariables: ["history", "input"],
  template: _DEFAULT_ENTITY_EXTRACTION_TEMPLATE,
});

export const CLAIRE_ENTITY_SUMMARIZATION_TEMPLATE = `You are an AI assistant helping a human keep track of facts about relevant people, places, and concepts in their life. Update and add to the summary of the provided entity in the "Entity" section based on the last line of your conversation with the human. If you are writing the summary for the first time, return a single sentence.
The update should only include facts that are relayed in the last line of conversation about the provided entity, and should only contain facts about the provided entity.

If there is no new information about the provided entity or the information is not worth noting (not an important or relevant fact to remember long-term), output the exact string "UNCHANGED" below.
Dates are attached to when existing information about the entity was acquired.
The current date/time is {datetime}.

Full conversation history (for context):
{history}

Entity to summarize:
{entity}

Existing summary of {entity}, 
{summary}

Last line of conversation:
Human: {input}
Updated summary (or the exact string "UNCHANGED" if there is no new information about {entity} above):`;

export const CLAIRE_ENTITY_SUMMARIZATION_PROMPT = new PromptTemplate({
  inputVariables: ["datetime", "entity", "summary", "history", "input"],
  template: CLAIRE_ENTITY_SUMMARIZATION_TEMPLATE,
});