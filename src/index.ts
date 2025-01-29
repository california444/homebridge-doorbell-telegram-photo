import type { API } from 'homebridge';
//import { readFileSync, writeFileSync } from 'fs';
import { DoorbellTelegramPhoto } from './platform.js';
import { PLATFORM_NAME } from './settings.js';

/**
 * This method registers the platform with Homebridge
 */
export default (api: API) => {

  // const configPath = api.user.configPath();
  // //this.log.debug('Migrating config from old accessory to new platform...');
  // const globalConfig = JSON.parse(readFileSync(configPath).toString());
  // const oldConfigs = globalConfig?.accessories?.filter(x => x.accessory === PLATFORM_NAME);
  // if(oldConfigs && oldConfigs.length > 0) {
  //   const updatedConfigs = oldConfigs.map(x => {
  //     const y = { ...x };
  //     y.platform = PLATFORM_NAME;
  //     delete y.accessory;
  //     return y;
  //   });
  //   globalConfig.platforms.push(...updatedConfigs);

  //   for (let i = globalConfig.accessories.length - 1; i >= 0; i--) {
  //     if (globalConfig.accessories[i].accessory === PLATFORM_NAME) {
  //       globalConfig.accessories.splice(i, 1);
  //     }
  //   }
  //   writeFileSync(configPath, JSON.stringify(globalConfig));
  // }


  api.registerPlatform(PLATFORM_NAME, DoorbellTelegramPhoto);
};