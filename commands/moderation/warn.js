const { MessageEmbed } = require("discord.js");
const { Color } = require("../../config.js");

module.exports = {
  name: "warn",
  aliases: [],
  description: "Warn a user!",
  usage: "warn <@user> <reason>",
  run: async (client, message, args) => {
    // Delete the triggering message (fails silently if cannot delete)
    message.delete().catch(() => {});

    // Permission check
    if (!message.member.permissions.has("BAN_MEMBERS")) {
      return message.channel.send(`❌ You don't have permission to use this command!`).catch(() => {});
    }

    const Member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!Member) {
      return message.channel.send(`❌ Please mention a valid user.`).catch(() => {});
    }

    const Reason = args.slice(1).join(" ") || "No reason provided.";

    // Add 1 warning to the database
    client.db.add(`Warnings_${message.guild.id}_${Member.user.id}`, 1);
    let Warnings = client.db.get(`Warnings_${message.guild.id}_${Member.user.id}`);

    // Warning embed
    const embed = new MessageEmbed()
      .setColor(Color || "YELLOW")
      .setTitle("⚠️ Member Warned")
      .addField("Moderator", `${message.author.tag} (${message.author.id})`, true)
      .addField("Warned Member", `${Member.user.tag} (${Member.user.id})`, true)
      .addField("Total Warnings", `${Warnings}`, true)
      .addField("Reason", Reason)
      .setFooter(`Requested by ${message.author.username}`)
      .setTimestamp();

    // Send the warning embed
    message.channel.send({ embeds: [embed] }).catch(() => {});

    // Timeout if 3 or more warnings
    if (Warnings >= 3) {
      try {
        await Member.timeout(60 * 60 * 1000, "Reached 3 warnings"); // 1 hour

        // Reset warnings
        client.db.set(`Warnings_${message.guild.id}_${Member.user.id}`, 0);

        const timeoutEmbed = new MessageEmbed()
          .setColor("RED")
          .setTitle("🚫 Member Timed Out")
          .setDescription(`${Member.user.tag} has been timed out for 1 hour due to receiving 3 warnings.`)
          .setTimestamp();

        message.channel.send({ embeds: [timeoutEmbed] }).catch(() => {});
      } catch (error) {
        console.error(error);
        message.channel.send(`⚠️ Failed to timeout the member. Check my permissions.`).catch(() => {});
      }
    }
  }
};
