import { getSnapshot, sendPictureToTelegram2 } from '../src/platformAccessory.js';
import { Api } from 'node-telegram-bot-api';

const timeout = 20000;

const BASE_URL = 'https://httpcan.org';

// Dedicated live test: this is the ONLY test that posts a real message into a
// real Telegram chat. It runs only when TELEGRAM_LIVE_TEST=1 is set
// (npm run test:live, and the dedicated CI job), so a plain `npm test`
// never sends anything.
const liveEnabled = process.env.TELEGRAM_LIVE_TEST === '1';
const describeLive = liveEnabled ? describe : describe.skip;

describeLive('Telegram live', () => {

  const botId = process.env.BOT_ID;
  const chatId = parseInt(process.env.CHAT_ID || '');

  test('sends a real photo to the configured chat', async () => {
    // Fail loudly rather than silently skipping: if the live test was
    // switched on, missing credentials are a misconfiguration.
    expect(botId).toBeTruthy();
    expect(Number.isNaN(chatId)).toBe(false);

    const telegramAPI = new Api(botId || '');
    const snapshot = await getSnapshot(BASE_URL + '/image/jpeg');
    expect(snapshot.length).toBeGreaterThan(0);

    const message = await sendPictureToTelegram2(snapshot, chatId, 'live test', telegramAPI);
    expect(message.chat.id).toBe(chatId);
  }, timeout);
});
