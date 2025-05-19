const { Client, GatewayIntentBits, Collection, ActivityType, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const keep_alive = require('./keep_alive.js');
const { Prefix, Token, Color } = require('./config.js');
const db = require('quick.db');

// Client Initialization
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel]
});

client.commands = new Collection();
client.aliases = new Collection();
client.slashCommands = new Collection();
client.db = db;

// SLASH COMMAND LOADER
const slashCommandsPath = path.join(__dirname, 'slashCommands');
if (fs.existsSync(slashCommandsPath)) {
  const slashFiles = fs.readdirSync(slashCommandsPath).filter(file => file.endsWith('.js'));
  for (const file of slashFiles) {
    const command = require(`./slashCommands/${file}`);
    if ('data' in command && 'execute' in command) {
      client.slashCommands.set(command.data.name, command);
    } else {
      console.warn(`[WARNING] Slash command at ${file} missing data or execute.`);
    }
  }
}

// READY EVENT
client.on('ready', () => {
  console.log(`Yo boii!! Moderation.V1 has been deployed!! Coded by 365 ɢᴀᴍɪɴɢ ɴ ᴍᴏʀᴇ_2.0#6766`);
  client.user.setActivity(`Glenrich Confessions, Satarkul`, {
    type: ActivityType.Watching
  });
});

// SLASH COMMAND HANDLER
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.slashCommands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: 'There was an error while executing this command.',
      ephemeral: true,
    });
  }
});

// PREFIX COMMAND LOADER
const modules = ['fun', 'info', 'moderation'];
modules.forEach(module => {
  const modulePath = path.join(__dirname, 'commands', module);
  if (!fs.existsSync(modulePath)) {
    console.warn(`Missing commands folder for module: ${module}`);
    return;
  }

  const files = fs.readdirSync(modulePath).filter(file => file.endsWith('.js'));
  files.forEach(file => {
    const command = require(path.join(modulePath, file));
    if (command.name) {
      client.commands.set(command.name, command);
      console.log(`${command.name} command loaded ✅`);
    }
    if (command.aliases && Array.isArray(command.aliases)) {
      command.aliases.forEach(alias => client.aliases.set(alias, command.name));
    }
  });
});

// PREFIX MESSAGE HANDLER
client.on('messageCreate', async message => {
  if (!message.guild || message.author.bot) return;

  if (message.content.startsWith(`<@!${client.user.id}>`)) {
    return message.channel.send(`Bot Prefix: ${Prefix}`);
  }

  if (!message.content.startsWith(Prefix)) return;

  const args = message.content.slice(Prefix.length).trim().split(/ +/g);
  const cmd = args.shift().toLowerCase();
  if (!cmd) return;

  const command =
    client.commands.get(cmd) ||
    client.commands.get(client.aliases.get(cmd));

  if (!command) return;

  if (!message.guild.members.me.permissions.has('Administrator')) {
    return message.channel.send(`I don't have the required Administrator permission to run this command.`);
  }

  try {
    command.run(client, message, args);
    console.log(
      `User: ${message.author.tag} (${message.author.id}) | Server: ${message.guild.name} (${message.guild.id}) | Command: ${command.name}`
    );
  } catch (err) {
    console.error(err);
    message.channel.send('There was an error executing this command.');
  }
});

// LOGIN
client.login(Token);
