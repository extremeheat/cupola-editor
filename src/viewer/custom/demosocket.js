const BLOCKSTATES_PATH = 'blockstates.json'

class DemoSocketProvider {
  constructor(socketPath) {
    this.didInit = false
    this.socketPath = socketPath
    // this.apiEndpoint = apiEndpoint;
    // this.atlas = null;
    // this.blockstates = null;
  }

  async init() {
    // let bsd = await fetch(`${this.apiEndpoint}/${BLOCKSTATES_PATH}`);
    // this.blockstates = bsd.json();
    // let atlas = 
    return {
      via: 'socket',
      socketAddress: this.socketPath
    }
  }

  getVersionData() {
    // if (!this.didInit) throw 'Not yet initialized';
    // const { version, atlas, blockstates } = this
    // return { version, atlas, blockstates }
    return null
  }

  update(cameraPosition) {
        
  }
}