const Discord = require("discord.js");
const { MessageEmbed } = require("discord.js");
const { Color } = require("../../config.js");

// In-memory warnings store
const warnings = new Map();

module.exports = {
  name: "warn",
  aliases: [],
  description: "Warn a member. 3 warnings = 1 hour timeout.",
  usage: "warn <Mention Member> [Reason]",
  run: async (client, message, args) => {
    message.delete();

    if (!message.member.permissions.has("ModerateMembers"))
      return message.channel.send(
        `You don't have permission to use this command!`
      );

    let Member = message.mentions.members.first();

    if (!Member)
      return message.channel.send(
        `Please mention a member that you want to warn!`
      );

    if (Member.id === message.author.id)
      return message.channel.send(`You can't warn yourself!`);

    if (Member.id === client.user.id)
      return message.channel.send(`Please don't warn me ;-;`);

    console.log("Moderatable:", Member.moderatable);
if (!Member.moderatable)
  return message.channel.send(`I can't moderate that member!`);


    let Reason = args.slice(1).join(" ") || "No reason provided!";

    // Track warnings per guild-member
    const key = `${message.guild.id}-${Member.id}`;
    let count = warnings.get(key) || 0;
    count++;
    warnings.set(key, count);

    const embed = new MessageEmbed()
      .setColor(Color)
      .setTitle("⚠️ Member Warned")
      .addField("Moderator", `${message.author.tag} (${message.author.id})`, true)
      .addField("Warned Member", `${Member.user.tag} (${Member.id})`, true)
      .addField("Reason", Reason, false)
      .addField("Warnings", `${count}/3`, true)
      .setTimestamp();

    message.channel.send({ embeds: [embed] });

    // Timeout if 3 warnings reached
    if (count >= 3) {
      try {
        await Member.timeout(60 * 60 * 1000, "Reached 3 warnings"); // 1 hour
        message.channel.send(
          `${Member} has been timed out for 1 hour due to reaching 3 warnings.`
        );
      } catch (err) {
        console.error(err);
        message.channel.send(
          `Failed to timeout the member. Do I have the correct permissions?`
        );
      }
      warnings.set(key, 0); // Reset warnings after timeout
    }
  },
};
