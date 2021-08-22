# homebridge-doorbell-telegram-photo

<a href="https://www.npmjs.com/package/homebridge-doorbell-telegram-photo"><img title="npm version" src="https://badgen.net/npm/v/homebridge-doorbell-telegram-photo" ></a>

**homebridge-doorbell-telegram-photo** is a Homebridge Plugin to send a camera snapshot on a doorbell event to Telegram. 

The camera must provide an http URL for snapshots. 

The plugin adds a switch in the Home App for an automation rule to trigger in case of an doorbell event

------

### Installation

- Install the plugin via Config UI X
- Create a Telegram Bot if not existing
- Configure the plugin settings via Config UI X
  - Provide a http URL for the snapshot of the camera
  - Provide the Bot ID of the Telegram Bot (without the leading "bot")
  - Provide the Chat ID of the Telegram Chat to send the pictures to (usually the first sign of the chat ID is a minus sign which must be included)
- In Home App add an automation rule that triggers the switch of this plugin in case of an doorbell event

