const Discord = require("discord.js");
const { Color } = require("../../config.js");

const warnings = new Map();

module.exports = {
  name: "warn",
  aliases: [],
  description: "Warn a member. 3 warnings = 1 hour timeout.",
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
      return message.channel.send(`Please don't try to warn me, sir...`);

    if (Member.id === message.guild.ownerId)
      return message.channel.send(`You can't warn the server owner!`);

    if (!Member.moderatable)
      return message.channel.send(`I can't moderate that member! Please check my role position.`);

    const Reason = args.slice(1).join(" ") || "No reason provided";

    // Store and increment warnings
    const key = `${message.guild.id}-${Member.id}`;
    let count = warnings.get(key) || 0;
    count++;
    warnings.set(key, count);

    const embed = new Discord.MessageEmbed()
      .setColor(Color)
      .setTitle(`Member Warned`)
      .addField(`Moderator`, `${message.author.tag} (${message.author.id})`)
      .addField(`Warned Member`, `${Member.user.tag} (${Member.id})`)
      .addField(`Reason`, Reason)
      .addField(`Total Warnings`, `${count}/3`)
      .setFooter(`Requested by ${message.author.username}`)
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });

    try {
      await Member.send(`You have been warned in **${message.guild.name}** for: ${Reason}`);
    } catch (err) {
      console.log("Couldn't DM the user.");
    }

    // Timeout on 3 warnings
    if (count >= 3) {
      try {
        await Member.timeout(60 * 60 * 1000, "Reached 3 warnings");
        warnings.set(key, 0); // Reset warning count

        await message.channel.send(
          `${Member.user.tag} has been timed out for 1 hour due to accumulating 3 warnings.`
        );
      } catch (error) {
        console.error(error);
        return message.channel.send(`Failed to timeout the member. Please check permissions.`);
      }
    }
  },
};
