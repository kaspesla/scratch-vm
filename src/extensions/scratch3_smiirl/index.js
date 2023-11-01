const formatMessage = require('format-message');
const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const fetchWithTimeout = require('../../util/fetch-with-timeout');
const log = require('../../util/log');

const serverTimeoutMs = 10000; // 10 seconds (chosen arbitrarily).


/**
 * Icon svg to be displayed at the left edge of each extension block, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const blockIconURI = 'data:image/png;base64,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';

/**
 * Class for the smiirl blocks in Scratch 3.0
 * @constructor
 */
class Scratch3SmiirlBlocks
{
    constructor(runtime)
    {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        this.getItemsForLightsMenu = function()
        {
            return this.menuNames;
        }

        this.noWait = 0.25;

        this.smiirlserver = this.readCookie("smiirlserver");

        this.configCallback = 0;
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo()
    {

        if (this.smiirlserver)
        {
            return {
                id: 'smiirl',
                name: 'Smiirl Counter',
                blockIconURI: blockIconURI,
                blocks: [
                {
                    opcode: 'setNumber',
                    text: formatMessage(
                    {
                        id: 'setNumber',
                        default: 'set counter to [NUMBER]',
                        description: 'ON'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments:
                    {
                        NUMBER:
                        {
                            type: ArgumentType.NUMBER,
                            defaultValue: "123"
                        }
		    }
		},
		{
                    opcode: 'changeNumber',
                    text: formatMessage(
                    {
                        id: 'changeNumber',
                        default: 'change counter by [NUMBER]',
                        description: 'ON'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments:
                    {
                        NUMBER:
                        {
                            type: ArgumentType.NUMBER,
                            defaultValue: "1"
                        }
                    }
                },
                "---",
                "---",
                "---",
                {
                    opcode: 'unpair',
                    text: formatMessage(
                    {
                        id: 'unpair',
                        default: 'unpair',
                        description: 'unpair'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments:
                    {
                    }
                }
                ]
            };
        }
        else
        {


            return {
                id: 'smiirl',
                name: 'Smiirl Counter',
                blockIconURI: blockIconURI,
                showStatusButton: true,
                blocks: [
                {
                    opcode: 'setupCounter',
                    text: formatMessage(
                    {
                        id: 'setupCounter',
                        default: 'Setup Smiirl [COUNTERID] [TOKEN]',
                        description: 'setup'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments:
                    {
                        TOKEN:
                        {
                            type: ArgumentType.STRING,
                            defaultValue: "TOKEN GOES HERE"
                        },
                        COUNTERID:
                        {
                            type: ArgumentType.STRING,
                            defaultValue: "COUNTER ID GOES HERE"
                        },
                    }
                }]
            }
        }
    }

    changeNumber(args)
    {
    
        let num = args.NUMBER;

        let url = this.smiirlserver.replace("ACTION", "add-number");
        url = url + "/" + num;
        this.counterAction(url);
    }
    setNumber(args)
    {
    
        let num = args.NUMBER;

        let url = this.smiirlserver.replace("ACTION", "set-number");
        url = url + "/" + num;
        this.counterAction(url);
    }


    counterAction(url)
    {
        fetch(url)
        .catch(err =>
        {
    	errMessage = 'Error connecting: ' + err;
        });
    }

    setUpCookie(counterId, token)
    {
        alert("You're good to go. You won't have to do this next time.");

        var url = "https://api.smiirl.com/" + counterId + "/ACTION/" + token;

        this.createCookie("smiirlserver", url);
        console.log("smiirlserver: " + url);
        document.location.reload();
    }

    eraseCookie(name)
    {
        console.log("remove cookie: " + name);
        this.createCookie(name, "", -1);
    }


    createCookie(name, value, days)
    {
        if (days)
        {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            var expires = "; expires=" + date.toGMTString();
        }
        else var expires = "";
        document.cookie = name + "=" + value + expires + "; path=/";
    }

    readCookie(name)
    {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++)
        {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    setupCounter(args)
    {
        let counterId = args.COUNTERID;
        let token = args.TOKEN;

	this.setUpCookie(counterId, token);

    }



    unpair(args)
    {
        if (confirm("Are you sure you want to unpair?"))
        {
            this.eraseCookie("smiirlserver");
            document.location.reload();
        }
    }
}


module.exports = Scratch3SmiirlBlocks;
