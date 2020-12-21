import { h, render, Component, Fragment } from 'preact'
const { ipcRenderer } = require('electron')

enum HP {
  Home,
  Controls,
  Load,
  Options,
  Homepage,
  Report,
  Create
}

const MainMenu = ({ handler }) => {
  return (
    <div class="boxc animated fadeIn faster">
      <div class="left">
        <div class="header">MC-Editor.js</div>
        <div style="padding-top: 20px;"></div>
        <div class="btn" onClick={() => handler(HP.Create)} value={HP.Create}>Create new world</div>
        <div class="btn" onClick={() => handler(HP.Load)} value={HP.Load}>Load world...</div>
      </div>
      <div class="right">
        <div class="btn" onClick={() => handler(HP.Controls)} value={HP.Controls}>Key Controls</div>
        <div class="btn" onClick={() => handler(HP.Options)} value={HP.Options}>Options</div>
        <div class="btn" onClick={() => handler(HP.Homepage)} value={HP.Homepage}>Homepage</div>
        <div class="btn" onClick={() => handler(HP.Report)} value={HP.Report}>Report issue</div>
      </div>
    </div>
  )
}

const MainKeys = ({ handler }) => {
  return (
    <div class="boxc animated fadeIn faster">
      <h3>Keyboard Shortcuts</h3>
      <p>Ctrl + N &mdash; Create new world</p>
      <p>Ctrl + O &mdash; Open world or schematic</p>
      <div style="margin-top:10%;">
        <div class="btn" onClick={() =>handler(HP.Home)} value={HP.Home}>Return to home</div>
      </div>
    </div>
  )
}

const MainCreate = ({ handler }) => {
  return (<div class="boxc">
    <h3>Create new world</h3>
    <div class="left" style="padding-right: 20px;">
      <label>Level type</label>
      <select class="formcontrol">
        <option>Java Edition (Anvil)</option>
        <option>Bedrock Edition (LevelDB)</option>
      </select>
    </div>
    <div class="right">
      <label>Level name</label>
      <input class="formcontrol" type="text" />
    </div>
    <div style="margin-top:10%;">
      <div class="btn">Return to home</div>
    </div>
  </div>)
}

const MainAbout = ({ handler }) => {
  return (
    <div class="boxc animated fadeIn faster">
      <h3>About</h3>
      <p>MC-Editor.js is a modern open source world editor for Minecraft, powered by the PrismaineJS project.</p>
      <p>Contribute at http://github.com/extremeheat/mceditor</p>
      <div style="margin-top:10%;">
        <div class="btn" onClick={() =>handler(HP.Home)} value={HP.Home}>Return to home</div>
      </div>
    </div>
  )
}

export class HomeScreen extends Component {
  state: {
    currentScreen: HP;
  }

  constructor() {
    super()
    this.state = {
      currentScreen: HP.Home
    }
  }

  stateControl = (newState) => {
    console.log('Home =>', newState)
    this.setState({ currentScreen: newState })
  };

  render(props, { currentScreen }) {
    console.warn(this.state.currentScreen, HP.Home, this.state.currentScreen == HP.Home)

    let content = null
    switch (currentScreen) {
    case HP.Home:
      content = <MainMenu handler={this.stateControl} />
      break
    case HP.Controls:
      content = <MainKeys handler={this.stateControl} />
      break
    case HP.Load:
    case HP.Create:
      ipcRenderer.send('OpenViewer')
      break
    default:
      content = <MainAbout handler={this.stateControl} />
      break
    }

    return (
      <div id="home">
        <link rel="stylesheet" href="home.css" />
        <div class="box">
          { content }
        </div>
      </div>
    )
  }
}

