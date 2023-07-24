import { PromptTemplate } from "langchain/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";

// const DEFAULT_CLAIRE_SCHEDULE_MESSAGE_TEMPLATE = `Take on the role of a friend of {user}.
// Based on the conversation history provided below, decide whether it would be natural to send a follow-up message in the future, and if so, when.
// The message will be sent at the time you specify, and should make sense at that time. If you don't think it would be natural to send a follow-up message, leave the message blank.
// If {user} references a time in the future and you send a message at that time, it should be in the present tense.
// For example, if {user} says "I'm going to the store tomorrow", it would be natural to send a message like "How was your trip to the store?" the next day.
// If {user} says "I have a doctor's appointment at 9am", it would be natural to send a message like "How did your doctor's appointment go?" at 10am.
// If {user} says "I need to remember to call my dad tomorrow", it would NOT be natural to send a message like "Remember to call your dad tomorrow." the next day, because {user} will have already done that.
// If {user} says "Remind me to pick up the kids in an hour", it would be natural to say "Remember to pick up the kids!" an hour later, not "Remember to pick up the kids in an hour!".
// For reference, the current time is {datetime}.`
const DEFAULT_CLAIRE_SCHEDULE_MESSAGE_TEMPLATE = `Take on the role of a friend of {user}.
Based on the conversation history provided below, ending with your last message, decide whether it would be natural to send a follow-up message in the future, and if so, when.
The message will be sent at the time you specify, and the language used should correspond to the context at the delivery time, not the time of composition.
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