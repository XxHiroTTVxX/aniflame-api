import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { loadCommands } from './utils/loadCommands';
import { getEnvVar } from '../utils/envUtils';

// Add commands property to client
class ExtendedClient extends Client {
    commands: Collection<string, any> = new Collection();
}

const client = new ExtendedClient({ 
    intents: [GatewayIntentBits.Guilds] 
});

const token = getEnvVar('DISCORD_BOT_TOKEN');
const applicationId = getEnvVar('DISCORD_APPLICATION_ID');
const guildId = getEnvVar('DISCORD_GUILD_ID');

client.once('ready', async () => {
    console.log(`Logged in as ${client.user?.tag}`);
    
    // Load commands and store them in client.commands
    const commands = await loadCommands(token, applicationId, guildId);
    client.commands = commands;
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ 
            content: 'There was an error while executing this command!', 
            ephemeral: true 
        });
    }
});

client.login(token);
