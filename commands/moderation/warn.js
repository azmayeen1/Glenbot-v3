const { PermissionsBitField, EmbedBuilder } = require('discord.js');

// Simple in-memory storage. Replace with a database (e.g., quick.db or MongoDB) for persistence.
const warnings = new Map();

module.exports = {
    name: 'warn',
    description: 'Warn a user. After 3 warnings, the user will be timed out for 1 hour.',
    usage: '!warn @user [reason]',
    execute: async (message, args) => {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return message.reply("You don't have permission to use this command.");
        }

        const user = message.mentions.members.first();
        const reason = args.slice(1).join(' ') || "No reason provided";

        if (!user) return message.reply("Please mention a valid user.");
        if (user.id === message.author.id) return message.reply("You can't warn yourself.");
        if (!user.moderatable) return message.reply("I can't moderate this user.");

        const key = `${message.guild.id}-${user.id}`;
        let count = warnings.get(key) || 0;
        count += 1;
        warnings.set(key, count);

        const embed = new EmbedBuilder()
            .setTitle("⚠️ Warning Issued")
            .addFields(
                { name: "User", value: `${user}`, inline: true },
                { name: "Moderator", value: `${message.author}`, inline: true },
                { name: "Reason", value: reason, inline: false },
                { name: "Warnings", value: `${count}/3`, inline: true }
            )
            .setColor("Yellow")
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });

        if (count >= 3) {
            // Reset warnings
            warnings.set(key, 0);

            try {
                await user.timeout(60 * 60 * 1000, "Reached 3 warnings"); // 1 hour in ms
                message.channel.send(`${user} has been timed out for 1 hour due to 3 warnings.`);
            } catch (err) {
                console.error(err);
                message.channel.send("Failed to timeout the user. Do I have the right permissions?");
            }
        }
    }
};
