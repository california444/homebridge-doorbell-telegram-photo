
import { requestAuth, sendPictureToTelegram2 } from '../src/platformAccessory';
import { Logger } from 'tslog';
import { Ffmpeg } from '../src/ffmpeg';
process.env.NTBA_FIX_319 = '1';
process.env.NTBA_FIX_350 = '1';
import TelegramBot from 'node-telegram-bot-api';

const timeout = 20000;

describe('Doorbell', () => {
    
  const botId = process.env.BOT_ID;
  const chatId = parseInt(process.env.CHAT_ID || '');

  const telegramAPI = new TelegramBot(botId || '', {
    filepath: false,
  });
  const logger = new Logger({ name: 'myLogger' });
    
  describe('test auth', () => {
    test('Digest Auth', async () => {
      try {
        await requestAuth('GET', 'http://httpbin.org/digest-auth/auth/user/passwd', null, ['user','passwd'], 'json').then((response) => {
          expect(response.status).toBe(200);
          expect(response.data.authenticated).toBe(true);
        });
                
      } catch (error) {
        throw error;
      }
    }, timeout);

    test('Basic Auth', async () => {
      try {
        await requestAuth('GET', 'http://httpbin.org/basic-auth/user/passwd', null, ['user','passwd'], 'json').then((response) => {
          expect(response.status).toBe(200);
          expect(response.data.authenticated).toBe(true);
        });
      } catch (error) {
        throw error;
      }
    }, timeout);

    test('Send to API (JPEG)', async () => {
      try {

        await requestAuth('GET', 'http://httpbin.org/image/jpeg', null, [], 'arraybuffer').then((response) => {
          expect(response.status).toBe(200);
          sendPictureToTelegram2(response.data, logger, chatId, 'test', telegramAPI).then(success =>{
            expect(success.chat.id).toBe(chatId);

          })
            .catch(err => {
              throw err;
            },
            );
        });
      } catch (error) {
        throw error;
      }
    }, timeout);

    test('Send to API (PNG)', async () => {
      try {
        await requestAuth('GET', 'http://httpbin.org/image/png', null, [], 'arraybuffer').then((response) => {
          expect(response.status).toBe(200);
          sendPictureToTelegram2(response.data, logger, chatId, 'URL PNG', telegramAPI).then(success =>{
            expect(success.chat.id).toBe(chatId);

          })
            .catch(err => {
              throw err;
            },
            );
        });
      } catch (error) {
        throw error;
      }
    }, timeout);

    test('Send to API (FFMPEG)', async () => {
      //const url = process.env.FFMPEG_URL || "";
      const url = '-i http://httpbin.org/image/png';

      try {
        const telegramAPI = new TelegramBot(botId || '', {
          filepath: false,
        });
        const ffmpeg = new Ffmpeg(logger);
        const snapshot = await (ffmpeg.fetchSnapshot(url, 'test'));

        try {
          sendPictureToTelegram2(snapshot, logger, chatId, 'FFMPEG', telegramAPI);
        } catch (e: any) {
          logger.error(e.message);
        }
      } catch (error) {
        throw error;
      }
    }, timeout);
  });
});