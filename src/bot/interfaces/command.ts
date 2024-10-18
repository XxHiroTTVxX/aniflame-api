import { ChatInputCommandInteraction, CommandInteraction, InteractionResponse, SlashCommandBuilder } from 'discord.js';

export default interface Command {
    data: SlashCommandBuilder;
    execute: (interaction: ChatInputCommandInteraction | CommandInteraction) => Promise<InteractionResponse>;

}