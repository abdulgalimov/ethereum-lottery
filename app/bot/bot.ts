import {Telegraf} from "telegraf";
import Web3 from 'web3';
import {NetworkInfo} from "../networks";

const { TELEGRAM_TOKEN, TELEGRAM_CHANNEL_ID } = process.env;

let network: NetworkInfo;
let bot: Telegraf
export async function start(_network: NetworkInfo) {
    network = _network;
    bot = new Telegraf(TELEGRAM_TOKEN as string);
}

const tryMessageTemplate = `
➕ Add amount: $tryAmount
🔢 Count: $count
💰 Total balance: $totalAmount`;
const winMessageTemplate = `
🎉 #Win
💰 Total balance: $totalAmount;
`;
export function notifyEvent(name: string, ...args: any[]) {
    let message: string = '';
    let blockhash: string = '';
    switch (name) {
        case 'try':
            message = tryMessageTemplate
                .replace('$tryAmount', formatAmount(args[0]))
                .replace('$count', args[1])
                .replace('$totalAmount', formatAmount(args[2]))
            blockhash = args[3];
            break;
        case 'win':
            message = winMessageTemplate
                .replace('$totalAmount', formatAmount(args[0]))
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

function formatAmount(amount: any): string {
    return Web3.utils.fromWei(amount, 'ether') + ' ETH';
}
