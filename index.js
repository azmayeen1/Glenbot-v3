const { Client, GatewayIntentBits, Collection, ActivityType } = require("discord.js");
const keep_alive = require("./keep_alive.js");
const fs = require("fs");
const path = require("path");
const { Prefix, Token, Color } = require("./config.js");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();
client.aliases = new Collection();
client.slashCommands = new Collection();
client.db = require("quick.db");

// SLASH COMMAND LOADER
const slashCommandsPath = path.join(__dirname, 'slashCommands');
if (fs.existsSync(slashCommandsPath)) {
  const slashFiles = fs.readdirSync(slashCommandsPath).filter(file => file.endsWith('.js'));
  for (const file of slashFiles) {
    const command = require(`./slashCommands/${file}`);
    if ('data' in command && 'execute' in command) {
      client.slashCommands.set(command.data.name, command);
    } else {
      console.warn(`[WARNING] The slash command at ${file} is missing a required "data" or "execute" property.`);
    }
  }
}

// READY EVENT
client.on("ready", async () => {
  console.log(`Moderation.V1 is live! Developed by 365 Gaming N More_2.0`);
  client.user.setActivity("Glenrich Confessions, Satarkul", {
    type: ActivityType.Watching
  });
});

// SLASH COMMAND HANDLER
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.slashCommands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: "There was an error while executing this command.", ephemeral: true });
  }
});

// COMMAND HANDLER
let modules = ["fun", "info", "moderation"];
modules.forEach(module => {
  const commandsPath = path.join(__dirname, `commands/${module}`);
  if (!fs.existsSync(commandsPath)) return console.warn(`Missing folder: ${commandsPath}`);

  fs.readdir(commandsPath, (err, files) => {
    if (err) throw err;
    files.filter(file => file.endsWith(".js")).forEach(file => {
      const command = require(`${commandsPath}/${file}`);
      console.log(`${command.name} command loaded ✅`);
      if (command.name) client.commands.set(command.name, command);
      if (command.aliases && Array.isArray(command.aliases)) {
        command.aliases.forEach(alias => client.aliases.set(alias, command.name));
      }
    });
  });
});

// MESSAGE COMMAND EXECUTION
client.on("messageCreate", async message => {
  if (message.channel.type === "dm" || message.author.bot || !message.guild) return;

  if (message.content === `<@!${client.user.id}>` || message.content === `<@${client.user.id}>`) {
    return message.channel.send(`Bot Prefix: \`${Prefix}\``);
  }

  if (!message.content.startsWith(Prefix)) return;

  const args = message.content.slice(Prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  if (!cmd) return;

  const command = client.commands.get(cmd) || client.commands.get(client.aliases.get(cmd));
  if (!command) return;

  if (!message.guild.members.me.permissions.has("Administrator")) {
    return message.channel.send("I lack the `Administrator` permission required to run this command.");
  }

  try {
    command.run(client, message, args);
    console.log(`User ${message.author.tag} (${message.author.id}) used command ${cmd} in ${message.guild.name}`);
  } catch (error) {
    console.error(error);
    message.channel.send("There was an error executing that command.");
  }
});

// LOGIN
client.login(Token);
