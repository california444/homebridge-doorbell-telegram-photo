/**
 * Developed by Roman Schlich
 * July 2021
 */

process.env.NTBA_FIX_319 = "1";
process.env.NTBA_FIX_350 = "1";
//const TelegramBot = require('node-telegram-bot-api');

import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  APIEvent,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  HAP,
  Logging,
  Service
} from "homebridge";
//import request, { AuthOptions, CoreOptions, Request } from "request";
//import got from 'got';
import { Ffmpeg } from "./ffmpeg";
import axios, { AxiosResponse } from "axios";
import * as crypto from 'crypto';
import TelegramBot from "node-telegram-bot-api";

let hap: HAP;

const PLUGIN_NAME = 'homebridge-doorbell-telegram-photo';
const ACCESSORY_NAME = 'Doorbell-Telegram-Photo';
const version = require('../package.json').version;

const timeout:number = 5000;
/*
 * Initializer function called when the plugin is loaded.
 */
let api = (api: API) => {
  hap = api.hap;
  api.registerAccessory(PLUGIN_NAME, ACCESSORY_NAME, DoorbellPhoto);
};
export {api as default}


class DoorbellPhoto implements AccessoryPlugin {

  private readonly log: Logging;
  private readonly name: string;
  private readonly botId: string;
  private readonly chatIds: string[];
  private readonly locale: string;
  private host: string;
  private timer: NodeJS.Timeout;
  private telegramAPI: any;
  private readonly useFfmpeg: boolean;
  private ffmpeg: Ffmpeg;

  private readonly doorbellPhotoService: Service;
  private readonly informationService: Service;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name;
    this.host = config.hostName;
    this.botId = config.botId;
    this.chatIds = config.chatIds || [];
    this.locale = config.locale || "de-DE";
    this.useFfmpeg = config.useFfmpeg;
    this.ffmpeg = new Ffmpeg(log);

    this.telegramAPI = new TelegramBot(this.botId, {
      filepath: false,
    });

    if(!this.chatIds || this.chatIds.length==0) this.chatIds[0] = config.chatId;

    this.log.debug("Then botId is: " + this.botId);
    this.log.debug("The chatIds are: "+this.chatIds.toString());

    this.doorbellPhotoService = new hap.Service.Switch(this.name);

    this.doorbellPhotoService.getCharacteristic(hap.Characteristic.On)
      .on(CharacteristicEventTypes.SET, (state: CharacteristicValue, callback: CharacteristicSetCallback) => {
        this.doorbellHandler(state as boolean);
        callback();
      })
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        callback(null, false);
      });

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, "California444")
      .setCharacteristic(hap.Characteristic.Model, "Telegram Photo Doorbell")
      .setCharacteristic(hap.Characteristic.SoftwareRevision, version);

    api.on(APIEvent.SHUTDOWN, this.shutdown.bind(this));

    log.info("Finished initializing!");
  }

  async doorbellHandler(state: boolean) {

    this.log.info('Doorbell ring received.');
    let timeInfo: String = new Date().toLocaleString(this.locale);

    this.timer = setTimeout(() => {
      this.log.debug('Doorbell handler timeout.' + timeInfo);
      this.doorbellPhotoService.updateCharacteristic(hap.Characteristic.On, false);
    }, 1000);

    let url = this.host;
    let logger: Logging = this.log;

    if (this.useFfmpeg) {
      logger.debug("Using ffmpeg to grab the snapshot...");

      try {
        const cached = !!this.ffmpeg.snapshotPromise;
        if (cached) logger.info("using cached picture...");

        let snapshot = await (this.ffmpeg.snapshotPromise || this.ffmpeg.fetchSnapshot(url, this.name));
        //this.sendPictureToTelegram(snapshot, timeInfo.toString());
        this.chatIds.forEach(chatID => {
          sendPictureToTelegram2(snapshot, logger, chatID, timeInfo.toString(), this.telegramAPI);
        });
        
      } catch (e: any) {
        logger.error(e.message);
      }
    }
    else {
      let creds = extractAuthInfo(url);

      requestAuth("GET", url, {}, creds, "arraybuffer").then((response) => {
        logger.info("Picture received successful!");
        this.chatIds.forEach(chatID => {
          sendPictureToTelegram2(response.data, logger, chatID, this.name + '  (' + timeInfo + ')', this.telegramAPI).then(success => {
            logger.info("Picture send to chatId: "+chatID);
          })
          .catch(error => {
            logger.error("Picture not send due to error: " + error);
          });
        });

      }).catch(error =>  {
        logger.error("No Picture received:" + error);
      });
    }
  }

  shutdown(): void {
    this.log.info("Shutdown");
    if (this.timer) clearTimeout(this.timer);
  }

  /*
   * This method is optional to implement. It is called when HomeKit ask to identify the accessory.
   * Typical this only ever happens at the pairing process.
   */
  identify(): void {
    this.log("Identify!" + ACCESSORY_NAME);
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    return [
      this.informationService,
      this.doorbellPhotoService,
    ];
  }
}
export interface Logging2 {
  info(message: string, ...parameters: any[]): void;
  warn(message: string, ...parameters: any[]): void;
  error(message: string, ...parameters: any[]): void;
  debug(message: string, ...parameters: any[]): void;
}

export function sendPictureToTelegram2(data: Buffer, logger:Logging2, chatId:string|number, caption:string, tApi): Promise<TelegramBot.Message> {

  let fileOptions = {
    // Explicitly specify the file name.
    filename: 'photo.jpeg',
    // Explicitly specify the MIME type.
    contentType: 'image/jpeg'
  };

  return tApi.sendPhoto(chatId, data, {
    caption: caption,
  }, fileOptions);
}

function extractAuthInfo(url:string):string[] {
    // check if auth information is included in URL and extract it
    const regexp = /(^[htps]*\:\/\/)([\w\:]*)(@)/;
    let match = url.match(regexp);

  if (match && match[2] && match[2].includes(":")) {
    let tokens = match[2].split(":");
    if (tokens.length == 2) return tokens;
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
      var eq = s.indexOf('=');
      if (eq === -1) {
        throw new Error('Digest parsing: param with no equal sign: ' + s);
      }
      var name = s.slice(0, eq);
      var value = s.slice(eq + 1);
      obj[name] = value.replace(/"/g, '')
      return obj
    }, {});
  };

  const renderDigest = params => {
    
    const attr = (key, quote) => {
      if (params[key]) {
        attrs.push(key + '=' + quote + params[key] + quote);
      }
    };
    var attrs = [];
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
    if (header && header.slice(0, 6) == 'Basic ') {
      return 'Basic ' + Buffer.from(creds[0] + ':' + creds[1]).toString('base64');
    }

    var params = parseDigest(header);
    if (!params.qop) {
      throw new Error('Not supported: qop is unspecified');
    }
    else if (params.qop === 'auth-int') {
      throw new Error('Not supported: qop is auth-int');
    }
    else if (params.qop === 'auth') {
      // keep going...
    }
    else {
      if (params.qop.split(/,/).includes('auth')) {
        // keep going...
        params.qop = 'auth';
      }
      else {
        throw new Error('Not supported: qop is ' + params.qop);
      }
    }
    
    ++count;
    const nc = ('00000000' + count).slice(-8);
    const cnonce = crypto.randomBytes(24).toString('hex');

    var ha1 = md5('ha1', creds[0] + ':' + params.realm + ':' + creds[1]);

    var path;
    if (url.startsWith('http://')) {
      path = url.slice(7);
    }
    else if (url.startsWith('https://')) {
      path = url.slice(8);
    }
    else {
      throw new Error('URL is neither HTTP or HTTPS: ' + url);
    }
    var slash = path.indexOf('/');
    path = slash === -1
      ? '/'
      : path.slice(slash);

    var ha2 = md5('ha2', method + ':' + path);
    var resp = md5('response', [ha1, params.nonce, nc, cnonce, params.qop, ha2].join(':'));
    var auth = {
      username: creds[0],
      realm: params.realm,
      nonce: params.nonce,
      uri: path,
      qop: params.qop,
      response: resp,
      nc: nc,
      cnonce: cnonce,
      opaque: params.opaque,
      algorithm: params.algorithm
    };
    return renderDigest(auth);
  };

  let response = axios({
    method: method,
    url: url,
    timeout: timeout,
    responseType: fetchAsType
  })
    .catch(err => {
      if (err.response.status === 401) {
        return axios({
          method: method,
          url: url,
          timeout: timeout,
          headers:  { "authorization": auth(err.response.headers['www-authenticate']) },
          responseType: fetchAsType
        })
      }
      throw err;
    }).catch(err => {
      throw err;
    });
    return response;
}