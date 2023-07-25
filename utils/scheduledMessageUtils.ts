import fs from 'fs';
import path from 'path';
import { IMessage, Profile } from '../types/types';
import moment from 'moment';
import { getClaireDirectory } from './utils';

/**
 * Returns an array of scheduled messages that are due to be sent to the specified user.
 * 
 * @param {string} uuid - The profile UUID whose scheduled messages to retrieve.
 * @returns {IMessage[]} An array of scheduled messages due to be sent to the specified user.
 */
export function getScheduledMessages(uuid: string): IMessage[] {
    const messagesFilePath = path.resolve(getClaireDirectory(), `${uuid}_storedMessages.json`);

    if (!fs.existsSync(messagesFilePath)) {
        return [];
    }

    const fileContents = fs.readFileSync(messagesFilePath, 'utf8');
    const allMessages: IMessage[] = JSON.parse(fileContents);

    // Exclude messages that are not yet due to be sent
    const scheduledMessages = allMessages.filter((message) => moment(message.timestamp).isSameOrBefore(moment()));

    return scheduledMessages;
}

/**
 * Removes the specified messages from the specified user's scheduled messages file.
 * 
 * @param {string} uuid - The profile UUID whose scheduled messages to remove.
 * @param {string[]} sentMessageIds - An array of messages to remove from the user's scheduled messages.
 */
export function removeSentMessages(uuid: string, sentMessageIds: string[]): void {
    const messagesFilePath = path.resolve(getClaireDirectory(), `${uuid}_storedMessages.json`);

    if (!fs.existsSync(messagesFilePath)) {
        return;
    }

    const fileContents = fs.readFileSync(messagesFilePath, 'utf8');
    const allMessages: IMessage[] = JSON.parse(fileContents);

    // Remove sent messages
    const remainingMessages = allMessages.filter((message) => !sentMessageIds.includes(message.id));

    // Overwrite the user's message file with the remaining messages
    fs.writeFileSync(messagesFilePath, JSON.stringify(remainingMessages, null, 2));
}

/**
* Writes a message to the specified user's stored messages file.
* 
* @param {string} uuid - The profile UUID to write the message for.
* @param {IMessage} message - The message to write to the user's stored messages.
*/
export function writeMessageToFile(uuid: string, message: IMessage): void {
    const filePath = path.join(getClaireDirectory(), `${uuid}_storedMessages.json`);
    let messages = [];

    try {
        // Check if file exists
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            messages = JSON.parse(data);
        }
    } catch (err) {
        console.error("Error reading file:", err);
    }

    messages.push(message);

    try {
        // Write the messages array to the file
        fs.writeFileSync(filePath, JSON.stringify(messages), 'utf8');
    } catch (err) {
        console.error("Error writing file:", err);
    }
}
