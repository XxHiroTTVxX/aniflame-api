import * as path from "path";
import fs from "fs";
import {Collection} from "discord.js";
import type Command from "../interfaces/command";
import {REST, Routes} from 'discord.js';


export async function loadCommands(token: string, applicationId: string, guildId: string) {
    const commands = new Collection<string, Command>();
    const commandsDir = path.resolve('./src/bot/commands');
    const commandFiles = fs.readdirSync(commandsDir).filter((file) => file.endsWith('.ts'));
    await Promise.all(commandFiles.map(async (file) => {
        const commandImport = await import(`${commandsDir}/${file}`);
        const command = commandImport?.default;
        if (command) {
            commands.set(command.data.name, command);
            console.log(`Command ${command.data.name} loaded.`);
        }
    }));
    const rest = new REST({version: '10'}).setToken(token);
    await rest.put(Routes.applicationGuildCommands(applicationId, guildId), {
        body: commands.map((command) => command.data)
    });
    console.log('Successfully reloaded guild application (/) commands.');
    return commands;
}