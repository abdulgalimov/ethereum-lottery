const footerTemplate = '<a href="$scanUrl">💠 View on scan</a>';

export const addMessageTemplate = `
➕ Add amount: $addAmount
💰 Balance: $totalAmount
💲 Min bet: $minBet
${footerTemplate}`;

export const tryStartMessageTemplate = `
🎲 Start game: $tryAmount
${footerTemplate}`;

export const tryFinishMessageTemplate = `
🏁 Finish game
🔢 Count: $count
💰 Balance: $totalAmount
💲 Min bet: $minBet
${footerTemplate}`;

export const winMessageTemplate = `
🎉 #Win
💰 Amount: $winAmount
${footerTemplate}`;

export const tryLuckTemplate = `📣 Try your luck
<code>$contractAddress</code>`;
