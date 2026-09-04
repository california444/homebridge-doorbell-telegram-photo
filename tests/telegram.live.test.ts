import { getSnapshot, sendPictureToTelegram2 } from '../src/platformAccessory.js';
import { Api } from 'node-telegram-bot-api';

const timeout = 20000;

const BASE_URL = 'https://httpcan.org';

// Dedicated live test: this is the ONLY test that posts a real message into a
// real Telegram chat. It runs as part of `npm test` and in CI. Every other test
// stubs the Telegram Api, so exactly one message goes out per test run.
// It is skipped only when no credentials are available (no .env.test / no CI vars).
const botId = process.env.BOT_ID;
const rawChatId = process.env.CHAT_ID;
const hasCredentials = !!botId && !!rawChatId && !Number.isNaN(parseInt(rawChatId));
const describeLive = hasCredentials ? describe : describe.skip;

describeLive('Telegram live', () => {

  const chatId = parseInt(rawChatId || '');

  test('sends a real photo to the configured chat', async () => {
    const telegramAPI = new Api(botId || '');
    const snapshot = await getSnapshot(BASE_URL + '/image/jpeg');
    expect(snapshot.length).toBeGreaterThan(0);

    const message = await sendPictureToTelegram2(snapshot, chatId, 'live test', telegramAPI);
    expect(message.chat.id).toBe(chatId);
  }, timeout);
});
