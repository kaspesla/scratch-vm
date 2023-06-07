const Runtime = require('../../engine/runtime');

const blockIconURI = require('./icon').blockIconURI;

const Clone = require('../../util/clone');
const Video = require('../../io/video');

const formatMessage = require('format-message');
const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const fetchWithTimeout = require('../../util/fetch-with-timeout');
const log = require('../../util/log');
const SpotVideoFeed = require('./SpotVideoFeed');


const moveTimeoutMS = 1000;
const rotateTimeoutMS = 50;
const sitStandTimeoutMS = 500;
const url = "http://192.168.4.55:8000/command";

let name = window.prompt("Enter Your Name: ")

const ws = new WebSocket("ws://192.168.4.55:8000/scratch-ws/");

document.querySelector("#spot-name").style = "display: block !important";

document.querySelector("#spot-name").value = name;
document.querySelector("#spot-name").onchange = (e) => {
    name = e.target.value;
    ws.send(JSON.stringify({
        type: "change-name",
        name: name
    }))
}

ws.onmessage = (message) => {
    const data = JSON.parse(message['data']);

    if (data.type == "request-name") {
        ws.send(JSON.stringify({
            type: "change-name",
            name: name ?? "No Name"
        }))
    }
    
    if (data.type == "ping") {
        ws.send(JSON.stringify({
            type: "ping"
        }));
    }
    
}


/**
 * Icon svg to be displayed at the left edge of each extension block, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len

const VideoState = {
    OFF: 'off',
    ON: 'on',
    ON_FLIPPED: 'on-flipped'
}

/**
 * Class for the makey makey blocks in Scratch 3.0
 * @constructor
 */
class Scratch3SpotBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        // this.videoFeed = new SpotVideoFeed.SpotVideoFeed();

        // this.runtime.ioDevices.video.setProvider(this.videoFeed);
        // this.runtime.ioDevices.video.enableVideo();

        /**
         * A toggle that alternates true and false each frame, so that an
         * edge-triggered hat can trigger on every other frame.
         * @type {boolean}
         */
/*        this.frameToggle = false;

        // Set an interval that toggles the frameToggle every frame.
        setInterval(() => {
            this.frameToggle = !this.frameToggle;
        }, this.runtime.currentStepTime);

        this.keyPressed = this.keyPressed.bind(this);
        this.runtime.on('KEY_PRESSED', this.keyPressed);

        this._clearkeyPressBuffer = this._clearkeyPressBuffer.bind(this);
//        this.runtime.on('PROJECT_STOP_ALL', this._clearkeyPressBuffer);
*/

    }

    _formatMenu (menu) {
        const m = [];
        for (let i = 0; i < menu.length; i++) {
            const obj = {};
            obj.text = menu[i];
            obj.value = i.toString();
            m.push(obj);
        }
        return m;
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        return {
            id: 'spot',
            name: 'Spot',
            blockIconURI: blockIconURI,
            blocks: [
                {
                    opcode: 'enableFeed',
                    text: formatMessage({
                        id: 'enableFeed',
                        default: 'enable video feed',
                        description: "Enable Spot's video feed"
                    }),
                    blockType: BlockType.COMMAND,
                   
                },
                {
                    opcode: 'disableFeed',
                    text: formatMessage({
                        id: 'disableFeed',
                        default: 'disable video feed',
                        description: "Disable Spot's video feed"
                    }),
                    blockType: BlockType.COMMAND,
                   
                },
               {
                    opcode: 'stand',
                    text: formatMessage({
                        id: 'stand',
                        default: 'stand',
                        description: 'Tell Spot to stand'
                    }),
                    blockType: BlockType.COMMAND,
                   
                },{
                    opcode: 'sit',
                    text: formatMessage({
                        id: 'sit',
                        default: 'sit',
                        description: 'Sit'
                    }),
                    blockType: BlockType.COMMAND,
                   
                    
                }, 
                
                {
                    opcode: 'setHeight',
                    text: formatMessage({
                        id: 'setHeight',
                        default: 'set height to [height]',
                        description: 'Set the robot height'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        height: {
                            type: "number",
                            defaultValue: 1
                        }
                    }
                },

                {
                    opcode: 'setLocomotionHint',
                    text: formatMessage({
                        id: 'setLocomotionHint',
                        default: 'set walk style to [hint]',
                        description: 'Set the robot walk style'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        hint: {
                            type: ArgumentType.STRING,
                            menu: 'locomotionHints'
                        }
                    }
                },

                {
                    opcode: 'turnRight',
                    text: formatMessage({
                        id: 'turnRight',
                        default: 'turn right [degrees] degrees',
                        description: 'Turn Right'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        degrees: {
                            type: "number",
                            defaultValue: 90
                        }
                    }
                   
                },
                     {
                    opcode: 'turnLeft',
                    text: formatMessage({
                        id: 'turnLeft',
                        default: 'turn left [degrees] degrees',
                        description: 'Turn Left'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        degrees: {
                            type: "number",
                            defaultValue: 90
                        }
                    }
                   
                },
                     {
                         opcode: 'forward',
                         text: formatMessage({
                             id: 'forward',
                             default: 'move forward [distance]',
                             description: 'Move Forward'
                         }),
                         blockType: BlockType.COMMAND,
                         arguments: {
                             distance: {
                                 type: "number",
                                 defaultValue: 1
                             }
                         }
                        
                     },
                      {
                         opcode: 'backward',
                         text: formatMessage({
                             id: 'backward',
                             default: 'move backward [distance]',
                             description: 'Move Backward'
                         }),
                         blockType: BlockType.COMMAND,
                         arguments: {
                             distance: {
                                 type: "number",
                                 defaultValue: 1
                             }
                         }
                        
                     },
                     {
                        opcode: 'moveLeft',
                        text: formatMessage({
                            id: 'moveLeft',
                            default: 'move left [distance]',
                            description: 'move left'
                        }),
                        blockType: BlockType.COMMAND,
                        arguments: {
                            distance: {
                                type: "number",
                                defaultValue: 1
                            }
                        }
                       
                    },
                    {
                        opcode: 'moveRight',
                        text: formatMessage({
                            id: 'moveRight',
                            default: 'move right [distance]',
                            description: 'move right'
                        }),
                        blockType: BlockType.COMMAND,
                        arguments: {
                            distance: {
                                type: "number",
                                defaultValue: 1
                            }
                        }
                       
                    },
                    /* Need to fix the handling of this command server-side
                    {
                        opcode: 'moveBody',
                        text: formatMessage({
                            id: 'moveBody',
                            default: 'move forward:[x] sideways:[y] turn:[z] degrees',
                            description: 'Move Body'
                        }),
                        blockType: BlockType.COMMAND,
                        arguments: {
                            "x": {
                                type: "number",
                                defaultValue: "1"
                            },
                            "y": {
                                type: "number",
                                defaultValue: "0"
                            },
                            "z": {
                                type: "number",
                                defaultValue: "0"
                            }
                        }
                       
                    },
                    */
                   {
                    opcode: 'rotatePitchBy',
                    text: formatMessage({
                        id: 'rotatePitchBy',
                        default: 'rotate pitch by [deg] degrees',
                        description : 'Rotate Pitch'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        "deg": {
                            type: "number",
                            defaultValue: "0"
                        }
                    }
                   },
                   {
                    opcode: 'rotateYawBy',
                    text: formatMessage({
                        id: 'rotateYawBy',
                        default: 'rotate yaw by [deg] degrees',
                        description : 'Rotate Yaw'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        "deg": {
                            type: "number",
                            defaultValue: "0"
                        }
                    }
                   },
                   {
                    opcode: 'rotateRollBy',
                    text: formatMessage({
                        id: 'rotateRollBy',
                        default: 'rotate roll by [deg] degrees',
                        description : 'Rotate Roll'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        "deg": {
                            type: "number",
                            defaultValue: "0"
                        }
                    }
                   },
                   {
                    opcode: 'resetRotation',
                    text: formatMessage({
                        id: 'reetRotation',
                        default: 'reset rotation',
                        descrption: 'Rotate body rotation'
                    }),
                    blockType: BlockType.COMMAND
                   },
                   {
                    opcode: 'rotateBodyBy',
                    text: formatMessage({
                        id: 'rotateBodyBy',
                        default: 'rotate by pitch:[pitch] yaw:[yaw] roll:[roll] degrees',
                        description: 'Rotate Body By'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        "pitch": {
                            type: "number",
                            defaultValue: "0"
                        },
                        "yaw": {
                            type: "number",
                            defaultValue: "0"
                        },
                        "roll": {
                            type: "number",
                            defaultValue: "0"
                        }
                    }
                   
                },
                    {
                        opcode: 'rotateBodyTo',
                        text: formatMessage({
                            id: 'rotateBodyTo',
                            default: 'rotate to pitch:[pitch] yaw:[yaw] roll:[roll] degrees',
                            description: 'Rotate Body To'
                        }),
                        blockType: BlockType.COMMAND,
                        arguments: {
                            "pitch": {
                                type: "number",
                                defaultValue: "0"
                            },
                            "yaw": {
                                type: "number",
                                defaultValue: "0"
                            },
                            "roll": {
                                type: "number",
                                defaultValue: "0"
                            }
                        }
                       
                    },
            ],
            menus: {
                locomotionHints: {
                    acceptReporters: true,
                    items: this._formatMenu(['auto', 'trot', 'crawl', 'jog', 'hop'])
                }
            }
        };
    }

    enableFeed(args)
    {
        this.runtime.ioDevices.video.enableVideo();
    }

    disableFeed(args)
    {
        this.runtime.ioDevices.video.disableVideo();
    }

    stand (args)
    {
        
        return this._makeRequest("stand", {}, waitTime=sitStandTimeoutMS);
    }
    sit (args)
    {
        
        return this._makeRequest("sit", {}, waitTime=sitStandTimeoutMS);
    }
    
    setHeight(args) {
        args['height'] = args['height']
        return this._makeRequest("set_height", args=args, waitTime=sitStandTimeoutMS)
    }

    setLocomotionHint(args) {
        args['hint'] = ['auto', 'trot', 'crawl', 'jog', 'hop'][parseFloat(args['hint'])];
        return this._makeRequest("set_locomotion_hint", args=args, waitTime=0)

    }
        
    turnRight (args)
    {
        const cmdArgs = {
        x: 0,
        y: 0,
        z: args.degrees * -1
        };
        return this._makeRequest("move", args=cmdArgs);
    }


    turnLeft (args)
    {
        const cmdArgs = {
        x: 0,
        y: 0,
        z: args.degrees
        };
        return this._makeRequest("move", args=cmdArgs);
    }

    forward (args)
    {
        const cmdArgs = {
            x: args.distance,
            y: 0,
            z: 0
        }
        return this._makeRequest("move", args=cmdArgs);
    }
    
    backward (args)
    {
        const cmdArgs = {
            x: args.distance * -1,
            y: 0,
            z: 0
        }
        return this._makeRequest("move", args=cmdArgs);
    }

    moveRight(args) {
        const cmdArgs = {
            x: 0,
            y: args.distance * -1,
            z: 0
        };
        return this._makeRequest("move", args=cmdArgs);
    }

    moveLeft(args) {
        const cmdArgs = {
            x: 0,
            y: args.distance * 1,
            z: 0
        };
        return this._makeRequest("move", args=cmdArgs);
    }

    rotatePitchBy(args) {
        const cmdArgs = {
            'pitch': args.deg,
            'yaw': 0,
            'roll': 0
        }
        return this._makeRequest("rotate_by", args=cmdArgs, waitTime=rotateTimeoutMS);
    }

    rotateYawBy(args) {
        const cmdArgs = {
            'pitch': 0,
            'yaw': args.deg,
            'roll': 0
        }
        return this._makeRequest("rotate_by", args=cmdArgs, waitTime=rotateTimeoutMS);
    }

    rotateRollBy(args) {
        const cmdArgs = {
            'pitch': 0,
            'yaw': 0,
            'roll': args.deg
        }
        return this._makeRequest("rotate_by", args=cmdArgs, waitTime=rotateTimeoutMS);
    }

    resetRotation(args) {
        const cmdArgs = {
            'pitch': 0,
            'yaw': 0,
            'roll': 0
        }
        return this._makeRequest("rotate", args = cmdArgs, waitTime=rotateTimeoutMS)
    }

    moveBody(args) {
        return this._makeRequest("move", args=args);
    }

    rotateBodyBy(args) {
        return this._makeRequest("rotate_by", args=args, waitTime=rotateTimeoutMS);
    }

    rotateBodyTo(args) {
        return this._makeRequest("rotate", args=args, waitTime=rotateTimeoutMS);
    }
    
    _makeRequest(commandName, args = {}, waitTime = moveTimeoutMS)
    {
        ws.send(JSON.stringify({
            type: "command",
            Command: commandName,
            Args: args
        }));

        return new Promise(resolve => setTimeout(resolve, waitTime));
    }
}
module.exports = Scratch3SpotBlocks;
