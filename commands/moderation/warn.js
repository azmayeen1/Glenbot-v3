const Discord = require("discord.js");
// Assuming 'Color' is defined in your config.js and accessible.
// Example: const { Color } = require("../../config.js");
// If not, you might need to define it directly or adjust the path.
const { Color } = require("../../config.js"); // Adjust path if needed

// This Map will store warning and timeout data for users.
// Format: Map<userId, {warnings: number, timeouts: number}>
// IMPORTANT: This data is NOT persistent. If your bot restarts, all warning/timeout data will be lost.
// For persistent data, you would use a database (e.g., MongoDB, SQLite) or a JSON file.
let userModerationData = new Map();

module.exports = {
  name: "warn",
  aliases: [],
  description: "Warn a member. 3 warnings = 1-hour timeout. 3 timeouts = kick.",
  usage: "warn <@member> [reason]",
  run: async (client, message, args) => {
    // Check if the message can be deleted and delete it (optional, based on your original commented code)
    // if (message.deletable) {
    //   message.delete().catch(() => {});
    // }

    // Check if the message author has the 'MODERATE_MEMBERS' permission (or 'KICK_MEMBERS' for older Discord.js versions)
    // 'MODERATE_MEMBERS' is the permission for timing out members.
    if (!message.member.permissions.has("MODERATE_MEMBERS")) {
      return message.channel.send(`You don't have permission to use this command!`);
    }

    // Get the member to warn, either by mention or ID
    let Member = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);

    // Validate if a valid member was found
    if (!Member) {
      return message.channel.send(`Please mention a valid member to warn!`);
    }

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

    // Removed the explicit check for server owner.
    // The bot can now attempt to warn the server owner,
    // but Discord's hierarchy rules will still apply.
    // If the bot's highest role is not above the owner's role,
    // the 'Member.moderatable' check below will catch it.
    // if (Member.id === message.guild.ownerId) {
    //   return message.channel.send(`You can't warn the server owner!`);
    // }

    // --- Removed: Check if the bot can moderate the target member based on role hierarchy ---
    // The bot will now attempt moderation actions, and any hierarchy/permission issues
    // will be caught by the try...catch blocks during timeout/kick.
    // if (!Member.moderatable) {
    //   return message.channel.send(`❌ I cannot moderate **${Member.user.tag}** because their highest role is equal to or higher than my highest role.`);
    // }
    // --- End Removed ---

    // Get the reason for the warning, default to "No reason provided"
    let Reason = args.slice(1).join(" ") || "No reason provided";

    // Get or initialize the user's moderation data
    let userData = userModerationData.get(Member.id);
    if (!userData) {
      userData = { warnings: 0, timeouts: 0 };
    }

    // Increment warning count
    userData.warnings++;
    userModerationData.set(Member.id, userData); // Update the map

    // Create and send the warning embed
    const warnEmbed = new Discord.MessageEmbed()
      .setColor(Color)
      .setTitle(`⚠️ Member Warned`)
      .addField(`Moderator`, `${message.author.tag} (${message.author.id})`)
      .addField(`Warned Member`, `${Member.user.tag} (${Member.id})`)
      .addField(`Reason`, Reason)
      .addField(`Total Warnings`, `${userData.warnings}/3`)
      .setFooter(`Requested by ${message.author.username}`)
      .setTimestamp();

    message.channel.send({ embeds: [warnEmbed] });

    // DM the warned user if they are not a bot
    if (!Member.user.bot) {
      Member.send(`You have been warned in **${message.guild.name}**. Reason: ${Reason}. You now have ${userData.warnings} warning(s).`)
        .catch(err => console.error(`Could not DM warned user ${Member.user.tag}: ${err}`));
    }

    // --- Timeout Logic ---
    if (userData.warnings >= 3) {
      userData.warnings = 0; // Reset warnings after a timeout
      userData.timeouts++;    // Increment timeout count
      userModerationData.set(Member.id, userData); // Update the map

      try {
        // Timeout the member for 1 hour (60 * 60 * 1000 milliseconds)
        await Member.timeout(60 * 60 * 1000, `Reached 3 warnings. Timeout #${userData.timeouts}`);

        const timeoutEmbed = new Discord.MessageEmbed()
          .setColor(Color)
          .setTitle(`⏱️ Member Timed Out`)
          .setDescription(`${Member.user.tag} has been timed out for 1 hour due to receiving 3 warnings.`)
          .addField(`Total Timeouts`, `${userData.timeouts}/3`)
          .setFooter(`Timeout issued by ${message.author.username}`)
          .setTimestamp();

        message.channel.send({ embeds: [timeoutEmbed] });

        // DM the timed out user if they are not a bot
        if (!Member.user.bot) {
          Member.send(`You have been timed out in **${message.guild.name}** for 1 hour after receiving 3 warnings. You now have ${userData.timeouts} timeout(s).`)
            .catch(err => console.error(`Could not DM timed out user ${Member.user.tag}: ${err}`));
        }

      } catch (err) {
        console.error(`Failed to timeout member ${Member.user.tag}:`, err);
        // Updated error message to be more general
        return message.channel.send(`❌ Failed to timeout **${Member.user.tag}**. Please ensure the bot's role is above the target member's highest role and it has "Timeout Members" permissions.`);
      }
    }

    // --- Kick Logic (after timeout logic) ---
    if (userData.timeouts >= 3) {
      try {
        // Kick the member
        await Member.kick(`Accumulated 3 timeouts.`);

        const kickEmbed = new Discord.MessageEmbed()
          .setColor(Color)
          .setTitle(`👢 Member Kicked`)
          .setDescription(`${Member.user.tag} has been kicked from the server due to accumulating 3 timeouts.`)
          .setFooter(`Kick issued by ${message.author.username}`)
          .setTimestamp();

        message.channel.send({ embeds: [kickEmbed] });

        // DM the kicked user if they are not a bot (this might fail if they're already kicked)
        if (!Member.user.bot) {
          Member.send(`You have been kicked from **${message.guild.name}** after accumulating 3 timeouts.`)
            .catch(err => console.error(`Could not DM kicked user ${Member.user.tag}: ${err}`));
        }

        // Clean up their data after kick
        userModerationData.delete(Member.id);
        console.log(`Cleaned up moderation data for ${Member.user.tag} after kick.`);

      } catch (err) { // Re-added the catch block for the kick logic
        console.error(`Failed to kick member ${Member.user.tag}:`, err);
        // This message will be sent if the kick fails due to permissions or hierarchy
        return message.channel.send(`❌ Failed to kick **${Member.user.tag}**. Please ensure the bot's role is above the target member's highest role and it has "Kick Members" permissions.`);
      }
    }
  },
};
