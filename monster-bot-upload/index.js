require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder,
    PermissionsBitField 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers
    ]
});

const PREFIX = '!';
const LOG_CHANNEL_ID = '970272963557457970';

// mapa pro stopky: userId -> { interval, start, channelMsg, dmMsg }
const stopkyMap = new Map();

client.once('ready', () => {
    console.log(`✅ Bot ${client.user.tag} je online na ${client.guilds.cache.size} serverech!`);
});

client.on('guildMemberAdd', async (member) => {
    try {
        const embed = new EmbedBuilder()
            .setTitle('🎉 Vítej na serveru!')
            .setDescription(`Ahoj **${member.user.username}**!`)
            .setThumbnail(member.user.displayAvatarURL())
            .addFields({
                name: '👑 Vytvořil',
                value: '[abano.monster](https://abano.monster/)'
            })
            .setColor('#00ff88')
            .setFooter({ text: 'Užij si zůstat!' });

        await member.send({ embeds: [embed] });
        console.log(`✅ DM odesláno: ${member.user.tag}`);
    } catch (error) {
        console.error(`❌ DM selhalo ${member.user.tag}:`, error.message);
    }
});

client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);

    // pomocná funkce pro stopky
    const formatTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const pad = (n) => n.toString().padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    };

    try {
        // !help
        if (command === 'help') {
            const embed = new EmbedBuilder()
                .setTitle('📋 Dostupné příkazy')
                .setDescription(
                    '`!kick @uživatel [důvod]` - Vyhodit\n' +
                    '`!ban @uživatel [důvod]` - Zabanovat\n' +
                    '`!mute @uživatel [důvod]` - Ztlumit (1h)\n' +
                    '`!unmute @uživatel` - Odmutovat\n' +
                    '`!kostka` - Hoď kostkou 1-6\n' +
                    '`!try` - Test DM\n' +
                    '`!ping` - Latence\n' +
                    '`!avatar [@uživatel]` - Avatar\n' +
                    '`!clear [počet]` - Smaž zprávy\n' +
                    '`!kamen [kámen/papír/nůžky]` - RPS\n' +
                    '`!serverinfo` - Info serveru\n' +
                    '`!valorant Jmeno#TAG` - Valorant stats\n' +
                    '`!stopky` - Spustí stopky\n' +
                    '`!stopkystop` - Zastaví tvoje stopky'
                )
                .setColor('#00ff00')
                .setFooter({ text: `Prefix: ${PREFIX}` });
            await message.reply({ embeds: [embed] });
            return;
        }

        // !try
        if (command === 'try') {
            try {
                const embed = new EmbedBuilder()
                    .setTitle('🧪 Test DM')
                    .setDescription(`Ahoj **${message.author.username}**! DM funguje! ✅`)
                    .setThumbnail(message.author.displayAvatarURL())
                    .setColor('#ffaa00')
                    .addFields({ name: 'Server', value: message.guild.name });

                await message.author.send({ embeds: [embed] });
                message.reply('📩 **DM odesláno!**');
            } catch (error) {
                message.reply('❌ **DM selhalo** (DMs vypnuté?)');
            }
            return;
        }

        // !kostka
        if (command === 'kostka') {
            const randomNumber = Math.floor(Math.random() * 6) + 1;
            const emojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
            const embed = new EmbedBuilder()
                .setTitle('🎲 Kostka')
                .setDescription(`**${randomNumber}** ${emojis[randomNumber - 1]}`)
                .setColor('#ff6600');
            await message.reply({ embeds: [embed] });
            return;
        }

        // !ping
        if (command === 'ping') {
            const embed = new EmbedBuilder()
                .setTitle('🏓 Pong!')
                .addFields(
                    { name: 'Websocket', value: `${client.ws.ping}ms`, inline: true },
                    { name: 'Uptime', value: `${Math.floor(client.uptime / 3600000)}h`, inline: true }
                )
                .setColor('#00ff88');
            await message.reply({ embeds: [embed] });
            return;
        }

        // !avatar
        if (command === 'avatar') {
            const target = message.mentions.users.first() || message.author;
            const embed = new EmbedBuilder()
                .setTitle(`${target.username} Avatar`)
                .setImage(target.displayAvatarURL({ size: 512, dynamic: true }))
                .setColor('#ffaa00');
            await message.reply({ embeds: [embed] });
            return;
        }

        // !clear
        if (command === 'clear') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                return message.reply('❌ Nemáš oprávnění!');
            }
            const count = Math.min(parseInt(args[0]) || 10, 100);
            const deleted = await message.channel.bulkDelete(count + 1, true);
            const msg = await message.channel.send(`🧹 **Smaženo ${deleted.size - 1} zpráv**`);
            setTimeout(() => msg.delete().catch(() => {}), 3000);
            return;
        }

        // !kamen
        if (command === 'kamen') {
            const choices = ['kámen', 'papír', 'nůžky'];
            const userChoice = (args.join(' ').toLowerCase() || choices[Math.floor(Math.random() * 3)]);
            const botChoice = choices[Math.floor(Math.random() * 3)];

            let result;
            if (userChoice === botChoice) result = '😐 Remíza!';
            else if (
                (userChoice === 'kámen' && botChoice === 'nůžky') ||
                (userChoice === 'papír' && botChoice === 'kámen') ||
                (userChoice === 'nůžky' && botChoice === 'papír')
            ) result = '✅ TY JSI VYHRAL!';
            else result = '❌ BOT VYHRAL!';

            const embed = new EmbedBuilder()
                .setTitle('✂️ Kámen-Papír-Nůžky')
                .addFields(
                    { name: 'Tvůj výběr', value: userChoice, inline: true },
                    { name: 'Bot', value: botChoice, inline: true },
                    { name: 'Výsledek', value: result }
                )
                .setColor(result.includes('VYHRAL') ? '#00ff00' : '#ff4444');
            await message.reply({ embeds: [embed] });
            return;
        }

        // !serverinfo
        if (command === 'serverinfo') {
            const guild = message.guild;
            const embed = new EmbedBuilder()
                .setTitle(`${guild.name} 📊`)
                .setThumbnail(guild.iconURL())
                .addFields(
                    { name: '👑 Vlastník', value: `<@${guild.ownerId}>`, inline: true },
                    { name: '🆔 ID', value: guild.id, inline: true },
                    { name: '👥 Členové', value: `${guild.memberCount}`, inline: true },
                    { name: '💬 Kanály', value: `${guild.channels.cache.size}`, inline: true },
                    { name: '🎭 Role', value: `${guild.roles.cache.size}`, inline: true }
                )
                .setColor('#0099ff');
            await message.reply({ embeds: [embed] });
            return;
        }

        // !kick
        if (command === 'kick') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                return await message.reply('❌ Nemáš KickMembers permise!');
            }

            const target = message.mentions.members.first();
            if (!target) return await message.reply('❌ Označ uživatele!');
            if (!target.kickable) {
                return await message.reply('❌ Nemohu kicknout tohoto uživatele (role/bot)!');
            }

            const reason = args.slice(1).join(' ') || 'Žádný důvod';
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

        // !ban
        if (command === 'ban') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                return await message.reply('❌ Nemáš BanMembers permise!');
            }

            const target = message.mentions.members.first();
            if (!target) return await message.reply('❌ Označ uživatele!');
            if (!target.bannable) {
                return await message.reply('❌ Nemohu banout tohoto uživatele (role/bot)!');
            }

            const reason = args.slice(1).join(' ') || 'Žádný důvod';
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

        // !mute
        if (command === 'mute') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                return await message.reply('❌ Nemáš ModerateMembers permise!');
            }

            const target = message.mentions.members.first();
            if (!target) return await message.reply('❌ Označ uživatele!');
            if (!target.moderatable) {
                return await message.reply('❌ Nemohu mutovat tohoto uživatele (role/bot)!');
            }

            const reason = args.slice(1).join(' ') || 'Žádný důvod';
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

        // !unmute
        if (command === 'unmute') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
                return await message.reply('❌ Nemáš ModerateMembers permise!');
            }

            const target = message.mentions.members.first();
            if (!target) return await message.reply('❌ Označ uživatele!');

            if (!target.isCommunicationDisabled()) {
                return await message.reply('❌ Uživatel není mutovaný!');
            }

            const reason = args.slice(1).join(' ') || 'Žádný důvod';
            await target.timeout(null, reason); // odstraní timeout

            const embed = new EmbedBuilder()
                .setTitle('🔊 Unmute')
                .setDescription(`**Uživatel:** ${target}\n**Moderátor:** ${message.author}\n**Důvod:** ${reason}`)
                .setColor('#00ff88')
                .setTimestamp();
            await message.reply({ embeds: [embed] });
            if (logChannel) await logChannel.send({ embeds: [embed] });
            return;
        }

        // !valorant
        if (command === 'valorant') {
            if (!args[0]) return message.reply('❌ `!valorant Jmeno#TAG` (např. TenZ#1000)');
            const riotId = args.join(' ');
            if (!riotId.includes('#')) return message.reply('❌ Formát: Jmeno#TAG');

            const embed = new EmbedBuilder()
                .setTitle(`📊 Valorant: ${riotId}`)
                .setURL(`https://tracker.gg/valorant/profile/riot/${riotId.replace('#', '%23')}/overview`)
                .setThumbnail('https://tracker.gg/valorant/assets/images/favicon-32x32.png')
                .setColor('#ff4655');
            await message.reply({ embeds: [embed] });
            return;
        }

        // !stopky
        if (command === 'stopky') {
            const userId = message.author.id;

            if (stopkyMap.has(userId)) {
                return message.reply('⏱ Už máš spuštěné stopky! Zastav je pomocí `!stopkystop`.');
            }

            const start = Date.now();

            const baseEmbed = new EmbedBuilder()
                .setTitle('⏱ Stopky')
                .setDescription('Čas: `00:00:00`')
                .setColor('#00ffff')
                .setFooter({ text: 'Stopky běží, zastav pomocí !stopkystop.' })
                .setTimestamp();

            const channelMsg = await message.reply({ embeds: [baseEmbed] });

            let dmMsg = null;
            try {
                dmMsg = await message.author.send({ embeds: [baseEmbed] });
            } catch (e) {
                // DM vypnuté, ignoruj
            }

            const interval = setInterval(async () => {
                const elapsed = Date.now() - start;
                const timeStr = formatTime(elapsed);

                const newEmbed = EmbedBuilder.from(baseEmbed)
                    .setDescription(`Čas: \`${timeStr}\``)
                    .setTimestamp();

                try {
                    await channelMsg.edit({ embeds: [newEmbed] });
                    if (dmMsg) {
                        await dmMsg.edit({ embeds: [newEmbed] });
                    }
                } catch (e) {
                    clearInterval(interval);
                    stopkyMap.delete(userId);
                }
            }, 1000);

            stopkyMap.set(userId, { interval, start, channelMsg, dmMsg });
            return;
        }

        // !stopkystop
        if (command === 'stopkystop') {
            const userId = message.author.id;

            if (!stopkyMap.has(userId)) {
                return message.reply('❌ Nemáš žádné aktivní stopky.');
            }

            const data = stopkyMap.get(userId);
            clearInterval(data.interval);
            stopkyMap.delete(userId);

            const elapsed = Date.now() - data.start;
            const timeStr = formatTime(elapsed);

            const finalEmbed = new EmbedBuilder()
                .setTitle('⏱ Stopky – zastaveno')
                .setDescription(`Konečný čas: \`${timeStr}\``)
                .setColor('#00ff88')
                .setTimestamp();

            try {
                await data.channelMsg.edit({ embeds: [finalEmbed] });
            } catch (e) {}

            if (data.dmMsg) {
                try {
                    await data.dmMsg.edit({ embeds: [finalEmbed] });
                } catch (e) {}
            }

            await message.reply(`⏹ Stopky zastaveny. Čas: \`${timeStr}\``);
            return;
        }

    } catch (error) {
        console.error('Příkaz chyba:', error);
        message.reply('❌ Chyba při provádění!');
    }
});

client.login(process.env.TOKEN);
