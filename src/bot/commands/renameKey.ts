import { SlashCommandBuilder } from 'discord.js';
import { db } from '../../db';
import { apiKeys } from '../../db/schema';
import { eq } from 'drizzle-orm';
import type Command from '../interfaces/command';

const data = new SlashCommandBuilder()
    .setName('rename-key')
    .setDescription('Rename your existing API key')
    .addStringOption(option =>
        option.setName('new-name')
            .setDescription('The new name for your API key')
            .setRequired(true)
    );

const execute = async (interaction: any) => {
    const newName = interaction.options.getString('new-name');
    const discordId = interaction.user.id;

    try {
        // Check if user has a key
        const existingKey = await db.select()
            .from(apiKeys)
            .where(eq(apiKeys.discordId, discordId))
            .limit(1);

        if (existingKey.length === 0) {
            return interaction.reply({
                content: 'You don\'t have an API key to rename. Use `/generate-key` to create one.',
                ephemeral: true
            });
        }

        // Update the key's name
        await db.update(apiKeys)
            .set({ name: newName })
            .where(eq(apiKeys.discordId, discordId));

        await interaction.reply({
            content: `Your API key has been successfully renamed to: **${newName}**`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error renaming API key:', error);
        await interaction.reply({
            content: 'There was an error renaming your API key. Please try again later.',
            ephemeral: true
        });
    }
};

const command = {
    data: data as SlashCommandBuilder,
    execute
} satisfies Command;

export default command; 