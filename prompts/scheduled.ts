import { PromptTemplate } from "langchain/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";


const DEFAULT_CLAIRE_SCHEDULE_MESSAGE_TEMPLATE = `Take on the role of a friend of {user}.
Based on the conversation history provided below, ending with your last message, decide whether it would be natural to send a follow-up message in the future, and if so, when.
The message will be sent at the time you specify, and the language used should correspond to the context at the delivery time, not the time of composition.
If the user explicitly requests a reminder or follow-up message, schedule one for the appropriate time.
If your last message says you will do something, now is the time to schedule it.
Choose to send follow-up messages sparingly. When in doubt, or if your last message adequately addresses the topic, don't send a follow-up message.
To choose not to send a follow-up message, leave the message blank.
If you send a message, it should be in the present tense and should make sense to the user at that time.
For reference, the current time is {datetime}.

Here's the conversation
{history}
{humanPrefix}: {input}
{aiPrefix}: {response}

{format_instructions}`;
export const scheduledMessageParser = StructuredOutputParser.fromNamesAndDescriptions({
    scheduledMessage: "string message to be sent in the future, or blank if no message should be sent",
    date: "date to send the message in format MM/DD/YYYY",
    time: "time to send the message in 24-hour format HH:MM",
});
const formatInstructions = scheduledMessageParser.getFormatInstructions();

export const CLAIRE_SCHEDULE_MESSAGE_TEMPLATE = new PromptTemplate({
    template: DEFAULT_CLAIRE_SCHEDULE_MESSAGE_TEMPLATE,
    inputVariables: ["history", "input", "response", "user", "datetime", "humanPrefix", "aiPrefix"],
    partialVariables: { format_instructions: formatInstructions },
});