// MIT license

const blockIconURI = 'data:image/png;base64,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';

class SingleGamepad {
    constructor(index) {
        this.id = null
        this.index = index
        this.currentMSecs = null
    }
    
    matches(gamepad) {
        return gamepad && this.index != null && gamepad.id == this.id && 
            gamepad.buttons.length == this.currentButtons.length && gamepad.axes.length == this.currentAxes.length
    }
    
    getGamepad(i) {
        var gamepads = navigator.getGamepads()
        if (gamepads == null || gamepads.length <= i || ! gamepads[i]) 
            return null
        return gamepads[i]
    }
    
    update(currentMSecs) {
        if (this.currentMSecs == currentMSecs)
            return
        
        var gamepad = this.getGamepad(this.index)
        
        if (gamepad == null) {
            this.id = null
            this.currentButtons = []
            this.previousButtons = []
            this.currentAxes = []
            this.previousAxes = []
            return
        }
        
        this.currentMSecs = currentMSecs
        
        if (!this.matches(gamepad)) {
            this.id = gamepad.id
        
            this.previousButtons = []
            for (var i=0;i<gamepad.buttons.length;i++) {
                this.previousButtons.push(false)
            }
            
            this.previousAxes = []
            for (var i=0;i<gamepad.axes.length;i++) {
                this.previousAxes.push(0)
            }
        }
        else {
            this.previousButtons = this.currentButtons
            this.previousAxes = this.previousAxes
        }
        
        this.currentButtons = []
        for (var i=0;i<gamepad.buttons.length;i++) {
            this.currentButtons.push(gamepad.buttons[i].pressed)
        }
        
        this.currentAxes = []
        for (var i=0;i<gamepad.axes.length;i++) {
            this.currentAxes.push(gamepad.axes[i])
        }
        console.log(this.currentButtons)
    }
    
    pressedReleased(currentMSecs,i,pr) {
        this.update(currentMSecs)
        
        if (i < this.currentButtons.length) {
            return this.currentButtons[i] != this.previousButtons[i] && this.currentButtons[i] == pr
        }
        
        return false
    }
    
    changedAxis(currentMSecs,i) {
        this.update(currentMSecs)
        
        if (i < this.currentAxes.length)
            return this.currentAxes[i] != this.previousAxes[i]
        
        return false
    }
    
    getButton(currentMSecs,i) {
        this.update(currentMSecs)
        console.log(""+currentMSecs+" "+i+this.currentButtons)
        if (i < this.currentButtons.length) {
            return this.currentButtons[i]
        }
        else {
            return false
        }
    }
    
    getAxis(currentMSecs,i) {
        this.update(currentMSecs)
        if (i < this.currentAxes.length)
            return this.currentAxes[i]
        else
            return false
    }
    
    rumble(s,w,t,i) {
        var gamepad = this.gamepads[i].getGamepad()
        if (gamepad != null && gamepad.vibrationActuator) {
            gamepad.vibrationActuator.playEffect("dual-rumble", {
                duration: 1000*t,
                strongMagnitude: Math.max(0,Math.min(s,1)),
                weakMagnitude: Math.max(0,Math.min(w,1))
            });
        }
    }
}

class ScratchGamepad {
    constructor(runtime) {
        this.id = null
        this.runtime = runtime
        this.gamepads = []
        for (var i=0;i<4;i++)
            this.gamepads.push(new SingleGamepad(i))
    }
    
    getInfo() {
        return {
            "id": "gamepad",
            "name": "Gamepad",
	  blockIconURI: blockIconURI,
            "blocks": [{
                        "opcode": "buttonPressedReleased",
                        "blockType": "hat",
                        "text": "button [b] [pr] of pad [i]",
                        "arguments": {
                            "b": {
                                "type": "number",
                                "defaultValue": "1"
                            },
                            "pr": {
                                "type": "number",
                                "defaultValue": "1",
                                "menu": "pressReleaseMenu"
                            },
                            "i": {
                                "type": "number",
                                "defaultValue": "1",
                                "menu": "padMenu"
                            },
                        },
                    },
                    {
                        "opcode": "buttonDown",
                        "blockType": "Boolean",
                        "text": "button [b] of pad [i] is down",
                        "arguments": {
                            "b": {
                                "type": "number",
                                "defaultValue": "1"
                            },
                            "i": {
                                "type": "number",
                                "defaultValue": "1",
                                "menu": "padMenu"
                            },
                        },                    
                    },
                    {
                        "opcode": "axisMoved",
                        "blockType": "hat",
                        "text": "axis [b] of pad [i] moved",
                        "arguments": {
                            "b": {
                                "type": "number",
                                "defaultValue": "1"
                            },
                            "i": {
                                "type": "number",
                                "defaultValue": "1",
                                "menu": "padMenu"
                            },
                        },
                    },
                    {
                        "opcode": "axisValue",
                        "blockType": "reporter",
                        "text": "axis [b] of pad [i] value",
                        "arguments": {
                            "b": {
                                "type": "number",
                                "defaultValue": "1"
                            },
                            "i": {
                                "type": "number",
                                "defaultValue": "1",
                                "menu": "padMenu"
                            },
                        },                    
                    },
                    {
                        "opcode": "rumble",
                        "blockType": "command",
                        "text": "rumble strong [s] and weak [w] for [t] sec. on pad [i]",
                        "arguments": {
                            "s": {
                                "type": "number",
                                "defaultValue": "0.25"
                            },
                            "w": {
                                "type": "number",
                                "defaultValue": "0.5"
                            },
                            "t": {
                                "type": "number",
                                "defaultValue": "0.25"
                            },
                            "i": {
                                "type": "number",
                                "defaultValue": "1",
                                "menu": "padMenu"
                            },
                        },                    
                    },
            ],
            "menus": {
                "pressReleaseMenu": [{text:"press",value:1}, {text:"release",value:0}],
                "padMenu": {
                            acceptReporters: true, 
                            items: [{text:"1",value:1}, {text:"2",value:2}, {text:"3",value:3}, {text:"4",value:4}],
                }
            }            
        };
    }
    
    buttonPressedReleased({b,pr,i}) {
        return this.gamepads[i-1].pressedReleased(this.runtime.currentMSecs,b-1,pr)
    }

    axisMoved({b,i}) {
        return this.gamepads[i-1].changedAxis(this.runtime.currentMSecs,b-1)
    }
    
    axisValue({b,i}) {
        return this.gamepads[i-1].getAxis(this.runtime.currentMSecs,b-1)
    }
    
    buttonDown({b,i}) {
        return this.gamepads[i-1].getButton(this.runtime.currentMSecs,b-1)
    }
    
    rumble({s,w,t,i}) {
        this.gamepads[i-1].rumble(s,w,t)
    }
}


module.exports = ScratchGamepad;

