import {Context, Telegraf, MiddlewareFn} from "telegraf";
import {NetworkInfo} from "../networks";

const { TELEGRAM_TOKEN, TELEGRAM_CHANNEL_ID } = process.env;

let network: NetworkInfo;
let bot: Telegraf
export async function start(_network: NetworkInfo) {
    network = _network;
    bot = new Telegraf(TELEGRAM_TOKEN as string);

    bot.command('start', onStart);
    bot.command('state', onState);

    await bot.launch();
}

async function onStart(ctx: Context, next: MiddlewareFn<any>) {
    await ctx.reply(`
/state - show current state
`);
}


async function onState(ctx: Context) {
    console.log('onState 1');
}

const tryMessageTemplate = `
➕ Add amount: $tryAmount
🔢 Count: $count
💰 Total balance: $totalAmount`;
const winMessageTemplate = `
🎉 Win
💰 Total balance: $totalAmount;
`;
export function notifyEvent(name: string, ...args: any[]) {
    let message: string = '';
    let blockhash: string = '';
    switch (name) {
        case 'try':
            message = tryMessageTemplate
                .replace('$tryAmount', args[0])
                .replace('$count', args[1])
                .replace('$totalAmount', args[2])
            blockhash = args[3];
            break;
        case 'win':
            message = winMessageTemplate
                .replace('$totalAmount', args[0])
            blockhash = args[1];
            break;
    }

    const scanUrl = network.scanUrl.replace('$hash', blockhash);
    if (message) {
        message = `${message}
<a href="${scanUrl}">⤴️ View on scan</a>`;
        return bot.telegram.sendMessage(TELEGRAM_CHANNEL_ID as string, message, {
            parse_mode: "HTML",
            disable_web_page_preview: true
        });
    }
}
