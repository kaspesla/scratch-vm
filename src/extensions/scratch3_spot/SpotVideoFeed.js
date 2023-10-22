const constants = require('./constants')

export class SpotVideoFeed {
    constructor(runtime) {
        this.runtime = runtime;
        this.videoIsRunning = false;
        this.socket = null;
        this._workspace = [];
        this._image = new Image();
        console.log("TEST!");
        
    }

    enableVideo() {
        this.videoIsRunning = true;
        this.socket = new WebSocket(`ws://${constants.server_ip}:${constants.server_port}/ws/`);

        this.socket.onmessage = (message) => {

            // console.log(message);

            var data = JSON.parse(message['data']);
            if (data['type'] == "@front") {
                var image = data["output"];
                this._image.src = "data:image/jpeg;base64," + image;
            }
        }
        
        $(window).on("beforeunload", () => {
            try {
                socket.send(
                    JSON.stringify({
                        action: "unload",
                    })
                );
            }
            catch(err) {
                console.log(err);
            }
        });

        return new Promise(resolve => resolve());
    }

    disableVideo() {
        this.videoIsRunning = false;
        return new Promise(resolve => resolve());
    }

    getFrame({dimensions, mirror, format, cacheTimeout}) {
        const workspace = this._getWorkspace({dimensions: [640, 480], mirror: false});
        const {canvas, context, lastUpdate, cacheData} = workspace; 
        console.log();
        if(this._image.getAttribute("src") == null)
            return;
        context.drawImage(this._image,
            // source x, y, width, height
            0, 0, this._image.width, this._image.height,
            // dest x, y, width, height
            0, 0, 640, 480
        );
        return canvas
    }

    _getWorkspace ({dimensions, mirror}) {
        let workspace = this._workspace.find(space => (
            space.dimensions.join('-') === dimensions.join('-') &&
            space.mirror === mirror
        ));
        if (!workspace) {
            workspace = {
                dimensions,
                mirror,
                canvas: document.createElement('canvas'),
                lastUpdate: 0,
                cacheData: {}
            };
            workspace.canvas.width = dimensions[0];
            workspace.canvas.height = dimensions[1];
            workspace.context = workspace.canvas.getContext('2d');
            this._workspace.push(workspace);
        }
        return workspace;
    }


}