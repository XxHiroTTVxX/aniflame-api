import { SlashCommandBuilder } from 'discord.js';
import { generateAndStoreKey } from '../../utils/key';
import { db } from '../../db';
import { apiKeys } from '../../db/schema';
import { eq } from 'drizzle-orm';
import type Command from '../interfaces/command';

const data = new SlashCommandBuilder()
    .setName('generate-key')
    .setDescription('Generate your API key')
    .addStringOption(option =>
        option.setName('name')
            .setDescription('Your name or identifier')
            .setRequired(true)
    );

const execute = async (interaction: any) => {
    const name = interaction.options.getString('name');
    const discordId = interaction.user.id;

    try {
        // Check if user already has a key
        const existingKey = await db.select()
            .from(apiKeys)
            .where(eq(apiKeys.discordId, discordId))
            .limit(1);

        if (existingKey.length > 0) {
            const keyInfo = existingKey[0];
            return interaction.reply({
                content: `You already have an API key:\n\`${keyInfo.key}\`\n\n` +
                        `**Name:** ${keyInfo.name}\n` +
                        `**Whitelisted:** ${keyInfo.whitelisted ? 'Yes' : 'No'}\n\n` +
                        'Would you like to rename your key? Reply with `/rename-key <new_name>`',
                ephemeral: true
            });
        }

        const apiKey = await generateAndStoreKey(discordId, name);
        await interaction.reply({
            content: `Here's your API key:\n\`${apiKey}\`\n\n**Name:** ${name}`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error generating API key:', error);
        await interaction.reply({
            content: 'There was an error generating your API key. Please try again later.',
            ephemeral: true
        });
    }
};
const command = {
    data: data as SlashCommandBuilder,
    execute
} satisfies Command;

export default command;