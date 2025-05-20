const Discord = require("discord.js");
const { MessageEmbed } = require("discord.js");
const { Color } = require("../../config.js");

module.exports = {
  name: "warn",
  aliases: [],
  description: "Warn A User! 3 warnings = 1-hour timeout. 3 timeouts = kick.",
  usage: "Warn <Mention User> | <Reason>",
  run: async (client, message, args) => {
    // Start
    message.delete(); // Deletes the command message as per your original code

    // Check if the message author has the 'BAN_MEMBERS' permission
    if (!message.member.hasPermission("BAN_MEMBERS")) {
      return message.channel.send(
        `You Don't Have Permission To Use This Command!`
      );
    }

    // Get the member to warn, either by mention or ID
    let Member =
      message.mentions.members.first() ||
      message.guild.members.cache.get(args[0]);

    // Validate if a valid member was found
    if (!Member) return message.channel.send(`Please Mention A User!`);

    // Prevent warning self
    if (Member.id === message.author.id) {
      return message.channel.send(`You can't warn yourself!`);
    }

    // Prevent warning the bot
    if (Member.id === client.user.id) {
      return message.channel.send(`You can't warn me!`);
    }

    // --- Prevent warning a specific user ID ---
    const OWNER_ID_TO_EXCLUDE = "1374003704700862474"; // The specific user ID you want to exclude from being warned
    if (Member.id === OWNER_ID_TO_EXCLUDE) {
      return message.channel.send(`❌ I cannot warn that specific user.`);
    }
    // --- End ---

    // Get the reason for the warning, default to "No Reason Provided!"
    let Reason = args.slice(1).join(" ");
    if (!Reason) Reason = "No Reason Provided!";

    // Initialize warnings and timeouts from the database if they don't exist
    // client.db.add will automatically set to 0 if not present before adding
    client.db.add(`Warnings_${message.guild.id}_${Member.user.id}`, 1);
    let Warnings = client.db.get(`Warnings_${message.guild.id}_${Member.user.id}`);

    // Ensure timeouts are initialized, default to 0 if not set
    let Timeouts = client.db.get(`Timeouts_${message.guild.id}_${Member.user.id}`);
    if (Timeouts === null) { // Check for null as .get might return null if not set
        client.db.set(`Timeouts_${message.guild.id}_${Member.user.id}`, 0);
        Timeouts = 0;
    }


    // Create and send the warning embed
    let warnEmbed = new MessageEmbed()
      .setColor(Color)
      .setTitle(`⚠️ Member Warned!`)
      .addField(`Moderator`, `${message.author.tag} (${message.author.id})`)
      .addField(`Warned Member`, `${Member.user.tag} (${Member.user.id})`)
      .addField(`Reason`, `${Reason}`)
      .addField(`Current Warnings`, `${Warnings}/3`)
      .setFooter(`Requested by ${message.author.username}`)
      .setTimestamp();

    message.channel.send({ embeds: [warnEmbed] });

    // --- Timeout Logic ---
    if (Warnings >= 3) {
      client.db.set(`Warnings_${message.guild.id}_${Member.user.id}`, 0); // Reset warnings
      client.db.add(`Timeouts_${message.guild.id}_${Member.user.id}`, 1); // Increment timeouts
      Timeouts = client.db.get(`Timeouts_${message.guild.id}_${Member.user.id}`); // Get updated timeout count

      try {
        // Timeout the member for 1 hour (60 * 60 * 1000 milliseconds)
        // Ensure the bot has 'MODERATE_MEMBERS' permission and its role is higher
        await Member.timeout(60 * 60 * 1000, `Accumulated 3 warnings. Timeout #${Timeouts}`);

        const timeoutEmbed = new MessageEmbed()
          .setColor(Color)
          .setTitle(`⏱️ Member Timed Out!`)
          .setDescription(`${Member.user.tag} has been timed out for 1 hour due to receiving 3 warnings.`)
          .addField(`Total Timeouts`, `${Timeouts}/3`)
          .setFooter(`Timeout issued by ${message.author.username}`)
          .setTimestamp();

        message.channel.send({ embeds: [timeoutEmbed] });

      } catch (err) {
        console.error(`Failed to timeout member ${Member.user.tag}:`, err);
        return message.channel.send(`❌ Failed to timeout **${Member.user.tag}**. Please ensure the bot's role is above the target member's highest role and it has "Timeout Members" permissions.`);
      }
    }

    // --- Kick Logic (after timeout logic) ---
    if (Timeouts >= 3) {
      try {
        // Kick the member
        // Ensure the bot has 'KICK_MEMBERS' permission and its role is higher
        await Member.kick(`Accumulated 3 timeouts.`);

        const kickEmbed = new MessageEmbed()
          .setColor(Color)
          .setTitle(`👢 Member Kicked!`)
          .setDescription(`${Member.user.tag} has been kicked from the server due to accumulating 3 timeouts.`)
          .setFooter(`Kick issued by ${message.author.username}`)
          .setTimestamp();

        message.channel.send({ embeds: [kickEmbed] });

        // Clean up their data from the database after kick
        client.db.delete(`Warnings_${message.guild.id}_${Member.user.id}`);
        client.db.delete(`Timeouts_${message.guild.id}_${Member.user.id}`);
        console.log(`Cleaned up moderation data for ${Member.user.tag} after kick.`);

      } catch (err) {
        console.error(`Failed to kick member ${Member.user.tag}:`, err);
        return message.channel.send(`❌ Failed to kick **${Member.user.tag}**. Please ensure the bot's role is above the target member's highest role and it has "Kick Members" permissions.`);
      }
    }
    // End
  },
};
