require('dotenv').config();
const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const PREFIX = '!';
const LOG_CHANNEL_ID = '1073269853818990604';

client.once('ready', () => {
    console.log(`✅ Bot ${client.user.tag} je online na ${client.guilds.cache.size} serverech!`);
});

client.on('guildMemberAdd', async (member) => {
    try {
        await member.send(`Ahoj ${member.user.username}! Vítej na serveru.🎉\nTohoto bota vytvořil majitel: https://abano.monster/`);
        console.log(`DM posláno ${member.user.tag}`);
    } catch (error) {
        console.error('DM selhalo:', error);
    }
});

client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);

    try {
        if (command === 'help') {
            const embed = new EmbedBuilder()
                .setTitle('📋 Dostupné příkazy')
                .setDescription(
                    '`!kick @uživatel [důvod]` - Vyhodit\n' +
                    '`!ban @uživatel [důvod]` - Zabanovat\n' +
                    '`!mute @uživatel [důvod]` - Ztlumit (1h)\n' +
                    '`!unmute @uživatel [důvod]` - Odmutovat\n' +
                    '`!valorant Jmeno#TAG` - Valorant stats\n'+
                    '`!help` - Help menu'
                )
                .setColor('#00ff00')
                .setFooter({ text: `Prefix: ${PREFIX}` });
            await message.reply({ embeds: [embed] });
            return;
        }

        if (command === 'kick') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return await message.reply('❌ Nemáš KickMembers permise!');
            const target = message.mentions.members?.first();
            if (!target || !target.kickable || target.id === message.guild.members.me.id) return await message.reply('❌ Neplatný cíl nebo nemohu kicknout (admin/bot)!');

            const reason = args.join(' ') || 'Žádný důvod';
            await target.kick(reason);

            const embed = new EmbedBuilder()
                .setTitle('👢 Kick')
                .setDescription(`**Uživatel:** ${target}\n**Moderátor:** ${message.author}\n**Důvod:** ${reason}`)
                .setColor('#ff9900')
                .setTimestamp();
            await message.reply({ embeds: [embed] });
            if (logChannel) await logChannel.send({ embeds: [embed] });
            return;
        }

        if (command === 'ban') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return await message.reply('❌ Nemáš BanMembers permise!');
            const target = message.mentions.members?.first();
            if (!target || !target.bannable || target.id === message.guild.members.me.id) return await message.reply('❌ Neplatný cíl nebo nemohu banout (admin/bot)!');

            const reason = args.join(' ') || 'Žádný důvod';
            await target.ban({ reason });

            const embed = new EmbedBuilder()
                .setTitle('🔨 Ban')
                .setDescription(`**Uživatel:** ${target}\n**Moderátor:** ${message.author}\n**Důvod:** ${reason}`)
                .setColor('#ff0000')
                .setTimestamp();
            await message.reply({ embeds: [embed] });
            if (logChannel) await logChannel.send({ embeds: [embed] });
            return;
        }

        if (command === 'mute') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return await message.reply('❌ Nemáš ModerateMembers permise!');
            const target = message.mentions.members?.first();
            if (!target || !target.moderatable || target.id === message.guild.members.me.id) return await message.reply('❌ Neplatný cíl nebo nemohu mutovat (admin/bot)!');

            const reason = args.join(' ') || 'Žádný důvod';
            await target.timeout(3600000, reason); // 1h

            const embed = new EmbedBuilder()
                .setTitle('🔇 Mute')
                .setDescription(`**Uživatel:** ${target}\n**Moderátor:** ${message.author}\n**Důvod:** ${reason}\n**Doba:** 1 hodina`)
                .setColor('#ffaa00')
                .setTimestamp();
            await message.reply({ embeds: [embed] });
            if (logChannel) await logChannel.send({ embeds: [embed] });
            return;
        }

        if (command === 'unmute') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return await message.reply('❌ Nemáš ModerateMembers permise!');
            const target = message.mentions.members?.first();
            if (!target || !target.isCommunicationDisabled() || target.id === message.guild.members.me.id) return await message.reply('❌ Uživatel není mutovaný nebo neplatný cíl!');

            const reason = args.join(' ') || 'Žádný důvod';
            await target.timeout(null, reason);  // Odstraní timeout

            const embed = new EmbedBuilder()
                .setTitle('🔊 Unmute')
                .setDescription(`**Uživatel:** ${target}\n**Moderátor:** ${message.author}\n**Důvod:** ${reason}`)
                .setColor('#00ff88')
                .setTimestamp();
            await message.reply({ embeds: [embed] });
            if (logChannel) await logChannel.send({ embeds: [embed] });
            return;
        }
    } catch (error) {
        console.error('Příkaz chyba:', error);
        await message.reply('❌ Chyba při provádění příkazu!');
    }
    if (command === 'valorant') {
    if (!args[0]) return await message.reply('❌ Použití: `!valorant Jmeno#TAG` (např. TenZ#1000)');
    
    const riotId = args.join(' ');
    if (!riotId.includes('#')) return await message.reply('❌ Formát: Jmeno#TAG');

    const embed = new EmbedBuilder()
        .setTitle(`📊 Valorant Stats: ${riotId}`)
        .setDescription('Klikni pro kompletní statistiky!')
        .setURL(`https://tracker.gg/valorant/profile/riot/${riotId.replace('#', '%23')}/overview`)
        .setThumbnail('https://tracker.gg/valorant/assets/images/favicon-32x32.png')
        .addFields(
            { name: 'Rank', value: 'Zobrazí na Tracker.gg', inline: true },
            { name: 'K/D', value: 'Headshot %', inline: true },
            { name: 'Winrate', value: 'Matches', inline: true }
        )
        .setColor('#ff4655')
        .setFooter({ text: 'Tracker.gg | Neoficiální stats' });

    await message.reply({ embeds: [embed] });
    return;
}

});

client.login('BOT_TOKEN');
