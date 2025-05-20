const Discord = require("discord.js");
const { MessageEmbed } = require("discord.js");
const { Color } = require("../../config.js");

module.exports = {
  name: "warn",
  aliases: [],
  description: "Warn A User! Resets warnings and times out after 3 warnings.",
  usage: "Warn <Mention User> | <Reason>",
  run: async (client, message, args) => {
    //Start
    message.delete();

    // Check if the message author has the 'MODERATE_MEMBERS' permission.
    // This permission is required for timing out members.
    if (!message.member.hasPermission("MODERATE_MEMBERS")) {
      return message.channel.send(
        `You Don't Have Permission To Use This Command! You need "Moderate Members" permission.`
      );
    }
    
    let Member =
      message.mentions.members.first() ||
      message.guild.members.cache.get(args[0]);

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
    const USER_ID_TO_EXCLUDE = "1374003704700862474"; // The specific user ID you want to exclude from being warned
    if (Member.id === USER_ID_TO_EXCLUDE) {
      return message.channel.send(`❌ I cannot warn that specific user.`);
    }
    // --- End ---

    // --- Removed: Check if the bot can moderate the target member based on role hierarchy ---
    // The bot will now attempt moderation actions, and any hierarchy/permission issues
    // will be caught by the try...catch blocks during timeout/kick.
    // if (!Member.moderatable) {
    //   return message.channel.send(`❌ I cannot moderate **${Member.user.tag}** because their highest role is equal to or higher than my highest role.`);
    // }
    // --- End Removed ---

    let Reason = args.slice(1).join(" ");
    if (!Reason) Reason = "No Reason Provided!"; // Ensure reason is not empty

    client.db.add(`Warnings_${message.guild.id}_${Member.user.id}`, 1);

    let Warnings = client.db.get(
      `Warnings_${message.guild.id}_${Member.user.id}`
    );

    // --- Ensure Color is valid, provide a fallback if not ---
    const embedColor = Color || "#FF0000"; // Default to red if Color is undefined/null
    // --- End Color fallback ---

    let embed = new MessageEmbed()
      .setColor(embedColor) // Use the validated color
      .setTitle(`⚠️ Member Warned!`)
      .addField(`Moderator`, `${message.author.tag} (${message.author.id})`) // Corrected closing parenthesis
      .addField(`Warned Member`, `${Member.user.tag} (${Member.user.id})`)
      .addField(`Now Member Warnings`, Warnings)
      .addField(`Reason`, `${Reason}`)
      .setFooter(`Requested by ${message.author.username}`)
      .setTimestamp();

    // Send the embed using the embeds array for Discord.js v13+ compatibility
    try {
      await message.channel.send({ embeds: [embed] });
    } catch (sendErr) {
      console.error(`Failed to send warn embed to channel:`, sendErr);
    }

    // --- Reset System Logic: Timeout after 3 warnings ---
    if (Warnings >= 3) {
      client.db.set(`Warnings_${message.guild.id}_${Member.user.id}`, 0); // Reset warnings to 0

      try {
        // Timeout the member for 1 hour (60 * 60 * 1000 milliseconds)
        // Ensure the bot has 'MODERATE_MEMBERS' permission and its role is higher
        await Member.timeout(60 * 60 * 1000, `Accumulated 3 warnings. Warnings reset.`);

        const timeoutEmbed = new MessageEmbed()
          .setColor(embedColor)
          .setTitle(`⏱️ Member Timed Out!`)
          .setDescription(`${Member.user.tag} has reached 3 warnings and has been timed out for 1 hour. Warnings have been reset.`)
          .setFooter(`Timeout issued by ${message.author.username}`)
          .setTimestamp();

        try {
          await message.channel.send({ embeds: [timeoutEmbed] });
        } catch (sendErr) {
          console.error(`Failed to send timeout embed to channel:`, sendErr);
        }

      } catch (err) {
        console.error(`Failed to timeout member ${Member.user.tag}:`, err);
        return message.channel.send(`❌ Failed to timeout **${Member.user.tag}**. Please ensure the bot's role is above the target member's highest role and it has "Timeout Members" permissions.`);
      }
    }
    //End
  }
};
