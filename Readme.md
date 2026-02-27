# homebridge-doorbell-telegram-photo

[![npm version](https://badgen.net/npm/v/homebridge-doorbell-telegram-photo)](https://www.npmjs.com/package/homebridge-doorbell-telegram-photo)
[![npm version beta](https://badgen.net/npm/v/homebridge-doorbell-telegram-photo/beta)](https://www.npmjs.com/package/homebridge-doorbell-telegram-photo/v/beta)
[![Node Build](https://github.com/california444/homebridge-doorbell-telegram-photo/actions/workflows/build.yml/badge.svg)](https://github.com/california444/homebridge-doorbell-telegram-photo/actions/workflows/build.yml)
[![npm downloads](https://badgen.net/npm/dt/homebridge-doorbell-telegram-photo)](https://www.npmjs.com/package/homebridge-doorbell-telegram-photo)

**homebridge-doorbell-telegram-photo** is a homebridge plugin to send pictures to Telegram chats e.g. based on a trigger, for example on a doorbell ring.

As input sources you can use:

- a http(s) URL for snapshots e.g. provided from your camera

- a ffmpeg command to grab a snapshot from the camera's video stream

The plugin adds a switch to be used for an automation rule to trigger in case of an doorbell event.

The plugin supports Basic Auth and Digest Auth and can extract the credentials from the URL if they provided in the form of http(s)://USER:PASSWORD@host/path

## Installation

- Install the plugin via Config UI X
- [Create a Telegram Bot](https://core.telegram.org/bots#3-how-do-i-create-a-bot) as described in the link, if required
- Configure the plugin settings via Config UI X:
  - Provide an individual name of the camera
  - Provide the bot Id of the Telegram Bot **(without the leading "bot" in the bot Id)**. The bot Id is received from bot father once the bot is created
  - Provide one or more chat Ids of the Telegram Chat to send the pictures to. Usually the first sign of the chat Id is a minus sign which must be **included**. To find out the chat Id you can send a telegram message to the bot in the desired chat and then open the following url in the browser: [https://api.telegram.org/[BOT_ID]/getUpdates](https://api.telegram.org/[BOT_ID]/getUpdates). (include the leading **bot** in the botId). Copy the chat Id from here
  - Check "use ffmpeg" option if your camera does not support an http(s) url for snapshots.
  - In the url field either provide the http URL for the snapshot of the camera or the ffmpeg command, e.g.:
  > -i rtsp://...
  > -fflags nobuffer -flags low_delay -fflags discardcorrupt -analyzeduration 0 -probesize 2000 -rtsp_transport tcp -i rtsp://...
- In Home App add an automation rule that triggers the switch of this plugin in case of an doorbell event

## Testing

For the tests in `tests/` environment variables are used (e.g. Telegram `BOT_ID` and `CHAT_ID`).

- Create a `.env.test` file in the project root
- Add the required environment variables (e.g. `BOT_ID`, `CHAT_ID`) with your values
- Run `npm test`
