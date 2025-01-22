/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CharacteristicValue, Logging, PlatformAccessory, Service } from 'homebridge';
import type { DoorbellTelegramPhoto } from './platform.js';
import TelegramBot from 'node-telegram-bot-api';
import { Ffmpeg } from './ffmpeg.js';
import axios, { AxiosResponse } from 'axios';
import * as crypto from 'crypto';

const timeout:number = 5000;

export type Device = {
  name:string,
  hostName:string,
  botId:string,
  chatIds:string[]
}

export interface Logging2 {
  info(message: string, ...parameters: any[]): void;
  warn(message: string, ...parameters: any[]): void;
  error(message: string, ...parameters: any[]): void;
  debug(message: string, ...parameters: any[]): void;
}

export function sendPictureToTelegram2(data: Buffer, logger:Logging2, chatId:string|number, caption:string, tApi): Promise<TelegramBot.Message> {
  const fileOptions = {
  // Explicitly specify the file name.
    filename: 'photo.jpeg',
    // Explicitly specify the MIME type.
    contentType: 'image/jpeg',
  };

  return tApi.sendPhoto(chatId, data, {
    caption: caption,
  }, fileOptions);
}

function extractAuthInfo(url:string):string[] {
// check if auth information is included in URL and extract it
  const regexp = /(^[htps]*:\/\/)([\w:]*)(@)/;
  const match = url.match(regexp);
  if (match && match[2] && match[2].includes(':')) {
    const tokens = match[2].split(':');
    if (tokens.length === 2) {
      return tokens;
    }
  }
}

/**
* https://github.com/fgeorges/mlproj/blob/master/src/node.js#L323
* @param method 
* @param url 
* @param options 
* @param creds 
* @returns 
*/
export async function requestAuth(method: string, url: string, options, creds: string[], fetchAsType):Promise<AxiosResponse> {
  let count = 0;
  const md5 = (name, str) => {
    return crypto.createHash('md5').update(str).digest('hex');
  };

  const parseDigest = header => {
    if (!header || header.slice(0, 7) !== 'Digest ') {
      throw new Error('Expect WWW-Authenticate for digest, got: ' + header);
    }
    return header.substring(7).split(/,\s+/).reduce((obj, s) => {
      const eq = s.indexOf('=');
      if (eq === -1) {
        throw new Error('Digest parsing: param with no equal sign: ' + s);
      }
      const name = s.slice(0, eq);
      const value = s.slice(eq + 1);
      obj[name] = value.replace(/"/g, '');
      return obj;
    }, {});
  };

  const renderDigest = params => {
    const attrs = [];
    const attr = (key, quote) => {
      if (params[key]) {
        attrs.push(key + '=' + quote + params[key] + quote);
      }
    };
  
    attr('username', '"');
    attr('realm', '"');
    attr('nonce', '"');
    attr('uri', '"');
    attr('algorithm', '');
    attr('response', '"');
    attr('opaque', '"');
    attr('qop', '');
    attr('nc', '');
    attr('cnonce', '"');
    return 'Digest ' + attrs.join(', ');
  };

  const auth = header => {
    if (header && header.slice(0, 6) === 'Basic ') {
      return 'Basic ' + Buffer.from(creds[0] + ':' + creds[1]).toString('base64');
    }

    const params = parseDigest(header);
    if (!params.qop) {
      throw new Error('Not supported: qop is unspecified');
    } else if (params.qop === 'auth-int') {
      throw new Error('Not supported: qop is auth-int');
    } else if (params.qop === 'auth') {
    // keep going...
    } else {
      if (params.qop.split(/,/).includes('auth')) {
      // keep going...
        params.qop = 'auth';
      } else {
        throw new Error('Not supported: qop is ' + params.qop);
      }
    }
    
    ++count;
    const nc = ('00000000' + count).slice(-8);
    const cnonce = crypto.randomBytes(24).toString('hex');

    const ha1 = md5('ha1', creds[0] + ':' + params.realm + ':' + creds[1]);

    let path;
    if (url.startsWith('http://')) {
      path = url.slice(7);
    } else if (url.startsWith('https://')) {
      path = url.slice(8);
    } else {
      throw new Error('URL is neither HTTP or HTTPS: ' + url);
    }
    const slash = path.indexOf('/');
    path = slash === -1
      ? '/'
      : path.slice(slash);

    const ha2 = md5('ha2', method + ':' + path);
    const resp = md5('response', [ha1, params.nonce, nc, cnonce, params.qop, ha2].join(':'));
    const auth = {
      username: creds[0],
      realm: params.realm,
      nonce: params.nonce,
      uri: path,
      qop: params.qop,
      response: resp,
      nc: nc,
      cnonce: cnonce,
      opaque: params.opaque,
      algorithm: params.algorithm,
    };
    return renderDigest(auth);
  };

  const response = axios({
    method: method,
    url: url,
    timeout: timeout,
    responseType: fetchAsType,
  })
    .catch(err => {
      if (err?.response?.status === 401) {
        return axios({
          method: method,
          url: url,
          timeout: timeout,
          headers:  { 'authorization': auth(err.response.headers['www-authenticate']) },
          responseType: fetchAsType,
        });
      }
      throw err;
    }).catch(err => {
      throw err;
    });
  return response;
}

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class DoorbellTelegramPhotoAccessory {
    
  private service: Service;
  private telegramAPI: any;
  public readonly log: Logging;

  private readonly name: string;
  private readonly botId: string;
  private readonly chatIds: string[];
  private readonly locale: string;
  private host: string;
  private timer: NodeJS.Timeout;
  private readonly useFfmpeg: boolean;
  private ffmpeg: Ffmpeg;

  constructor(
    private readonly platform: DoorbellTelegramPhoto,
    private readonly accessory: PlatformAccessory,
    private readonly device: Device,
  ) {
    this.name = device.name;
    this.host = device.hostName;
    this.botId = device.botId;
    this.chatIds = device.chatIds || [];
    
    this.log = platform.log;    
    this.locale = platform.config.locale || 'de-DE';
    this.useFfmpeg = platform.config.useFfmpeg;
    this.ffmpeg = new Ffmpeg(this.log);

    this.telegramAPI = new TelegramBot(this.botId, {
      filepath: false,
    });

    this.log.debug('Then botId is: ' + this.botId);
    this.log.debug('The chatIds are: '+this.chatIds.toString());

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'California444')
      .setCharacteristic(this.platform.Characteristic.Model, 'Telegram Photo Doorbell');

    this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.name);
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.doorbellHandler.bind(this)) // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this)); // GET - bind to the `getOn` method below
  }

  async doorbellHandler() {

    this.log.info('Doorbell ring received.');
    const timeInfo: string = new Date().toLocaleString(this.locale);

    this.timer = setTimeout(() => {
      this.log.debug('Doorbell handler timeout.' + timeInfo);
      this.service.updateCharacteristic(this.platform.Characteristic.On, false);
    }, 1000);

    const url = this.host;
    const logger: Logging = this.log;

    if (this.useFfmpeg) {
      logger.debug('Using ffmpeg to grab the snapshot...');

      try {
        const cached = !!this.ffmpeg.snapshotPromise;
        if (cached) {
          logger.info('using cached picture...');
        }

        const snapshot = await (this.ffmpeg.snapshotPromise || this.ffmpeg.fetchSnapshot(url, this.name));
        this.chatIds.forEach(chatID => {
          sendPictureToTelegram2(snapshot, logger, chatID, timeInfo.toString(), this.telegramAPI);
        });
      } catch (e: any) {
        logger.error(e.message);
        logger.debug(e.stack);
      }
    } else {
      const creds = extractAuthInfo(url);

      requestAuth('GET', url, {}, creds, 'arraybuffer').then((response) => {
        logger.info('Picture received successful!');
        this.chatIds.forEach(chatID => {
          sendPictureToTelegram2(response.data, logger, chatID, this.name + '  (' + timeInfo + ')', this.telegramAPI).then(() => {
            logger.info('Picture send to chatId: '+chatID);
          })
            .catch(error => {
              logger.error('Picture not send due to error: ' + error);
            });
        });
      }).catch(error =>  {
        logger.error('No Picture received:' + error);
      });
    }
  }

  async getOn(): Promise<CharacteristicValue> {

    //this.platform.log.debug('Get Characteristic On -> 0');
    //this.service.getCharacteristic(this.platform.Characteristic.On).value

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return 0;
  }
}