const { MessageEmbed } = require("discord.js");
const { Color } = require("../../config.js");

module.exports = {
  name: "warn",
  aliases: [],
  description: "Warn a user!",
  usage: "warn <@user> <reason>",
  run: async (client, message, args) => {
    message.delete();

    if (!message.member.permissions.has("BAN_MEMBERS"))
      return message.channel.send(`You don't have permission to use this command!`);

    const Member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!Member) return message.channel.send(`Please mention a valid user.`);

    const Reason = args.slice(1).join(" ") || "No Reason Provided!";

    // Add 1 warning
    client.db.add(`Warnings_${message.guild.id}_${Member.user.id}`, 1);
    let Warnings = client.db.get(`Warnings_${message.guild.id}_${Member.user.id}`);

    // Create the warning embed
    const embed = new MessageEmbed()
      .setColor(Color)
      .setTitle(`Member Warned`)
      .addField(`Moderator`, `${message.author.tag} (${message.author.id})`)
      .addField(`Warned Member`, `${Member.user.tag} (${Member.user.id})`)
      .addField(`Total Warnings`, `${Warnings}`)
      .addField(`Reason`, Reason)
      .setFooter(`Requested by ${message.author.username}`)
      .setTimestamp();

    message.channel.send({ embeds: [embed] });

    // If user hits 3 warnings
    if (Warnings >= 3) {
      try {
        await Member.timeout(60 * 60 * 1000, "Reached 3 warnings"); // 1 hour timeout
        client.db.set(`Warnings_${message.guild.id}_${Member.user.id}`, 0); // Reset warnings

        const timeoutEmbed = new MessageEmbed()
          .setColor("RED")
          .setTitle(`Member Timed Out`)
          .setDescription(`${Member.user.tag} has been timed out for 1 hour due to 3 warnings.`)
          .setTimestamp();

        message.channel.send({ embeds: [timeoutEmbed] });
      } catch (error) {
        console.error(error);
        message.channel.send(`Failed to timeout the member. Ensure I have the correct permissions.`);
      }
    }
  }
};
