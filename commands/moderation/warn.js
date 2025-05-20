const Discord = require("discord.js");
const { Color } = require("../../config.js");

let warnings = new Map();

module.exports = {
  name: "warn",
  aliases: [],
  description: "Warn a member. 3 warnings = 1-hour timeout.",
  usage: "warn <@member> [reason]",
  run: async (client, message, args) => {
    message.delete();

    if (!message.member.permissions.has("MODERATE_MEMBERS"))
      return message.channel.send(`You don't have permission to use this command!`);

    let Member = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);

    if (!Member)
      return message.channel.send(`Please mention a valid member to warn!`);

    if (Member.id === message.author.id)
      return message.channel.send(`You can't warn yourself!`);

    if (Member.id === client.user.id)
      return message.channel.send(`You can't warn me!`);

    if (Member.id === message.guild.ownerId)
      return message.channel.send(`You can't warn the server owner!`);

    let Reason = args.slice(1).join(" ") || "No reason provided";
    let userWarnings = warnings.get(Member.id) || 0;
    userWarnings++;
    warnings.set(Member.id, userWarnings);

    const warnEmbed = new Discord.MessageEmbed()
      .setColor(Color)
      .setTitle(`⚠️ Member Warned`)
      .addField(`Moderator`, `${message.author.tag} (${message.author.id})`)
      .addField(`Warned Member`, `${Member.user.tag} (${Member.id})`)
      .addField(`Reason`, Reason)
      .addField(`Total Warnings`, `${userWarnings}/3`)
      .setFooter(`Requested by ${message.author.username}`)
      .setTimestamp();

    message.channel.send({ embeds: [warnEmbed] });

    // DM the warned user if not a bot
    if (!Member.user.bot) {
      Member.send(`You have been warned in **${message.guild.name}**. Reason: ${Reason}`);
    }

    if (userWarnings >= 3) {
      warnings.set(Member.id, 0); // Reset warnings after timeout

      try {
        await Member.timeout(60 * 60 * 1000, "Reached 3 warnings");
        const timeoutEmbed = new Discord.MessageEmbed()
          .setColor(Color)
          .setTitle(`⏱️ Member Timed Out`)
          .setDescription(`${Member.user.tag} has been timed out for 1 hour due to receiving 3 warnings.`)
          .setFooter(`Timeout issued by ${message.author.username}`)
          .setTimestamp();

        message.channel.send({ embeds: [timeoutEmbed] });

        if (!Member.user.bot) {
          Member.send(`You have been timed out in **${message.guild.name}** for 1 hour after receiving 3 warnings.`);
        }
      } catch (err) {
        return message.channel.send(`❌ Failed to timeout the member. Check role position or permissions.`);
      }
    }
  },
};
