import { Component, Fragment, h, render } from 'preact'
import { R } from 'main/Strings'
import { WorldBar } from './sidebar/World'
import { PlayerBar } from './sidebar/Player'
import { TeapotBar } from './sidebar/Teapot'
import { PaletteComponent } from './Palette'
const { ipcRenderer } = require('electron')

enum SidebarModes {
  Hidden, // not active
  Select, Brush, World, Players,
  Import, History, Filter, Plugins,
  Exit, //Just for testing
}

interface IEditorState {
  renderDistance: number;
  viewerDimension: string;

  showingPalette: boolean;

  //
  sidebarMode: SidebarModes;

  // Can we undo/redo ?
  hasForwardHistory: boolean;
  hasBackwardHistory: boolean;

  historySize: number;

  // Whether the user has actively selected something
  // used to decide should show Selection menu on sidebar
  hasActiveSelection: boolean;
  hasActiveBrush: boolean;
}

export enum H {
  // TopBar
  EditDimension, EditViewDistance, Undo, Redo,
  // SideBar
  ExpandSidebar,
  CommitChanges,
}

export interface IEditorComponent {
  // The state controller
  handler: (handlerCommand: H, ...event) => void;
  // Current editor state data
  editorState: IEditorState;
}

const TopBar = ({ handler, editorState }: IEditorComponent) => {
  return (
    <div class="topbar">
      <div class="topbar-left">
        <span class="clickable" onClick={() => handler(H.EditDimension)}>
          {editorState.viewerDimension}
        </span>{' '}
        &nbsp;
        <span
          class="clickable extras"
          onClick={() => handler(H.EditViewDistance)}
        >
          View Distance: {editorState.renderDistance}
        </span>
      </div>
      <div class="topbar-right">
        <div class={`top-i ${editorState.hasBackwardHistory ? 'clickable' : 'unclickable'}`}>
          <i class="gg-undo"></i>
          <span
            style="padding-top: 8px"
            onClick={() => handler(H.Undo)}
          >
            Undo
          </span>
        </div>
        <div class={`top-i ${editorState.hasBackwardHistory ? 'clickable' : 'unclickable'}`}>
          <i class="gg-redo"></i>
          <span
            style="padding-top: 8px"
            onClick={() => handler(H.Redo)}
          >
            Redo
          </span>
        </div>
      </div>

      <div class="topbar-details">
        <span class="extras">My World &bull;</span>
        {
          editorState.historySize >= 0 ?
            <span style="color: lightblue; font-style: italic"
              onClick={() => handler(H.CommitChanges)}
            >
              &nbsp; {editorState.historySize + ' Unsaved'}
            </span> : <span style="color: white;color: lightgreen;"
              onClick={() => handler(H.CommitChanges)}
            >
              &nbsp; Locked <span class='emojii'>🔒</span>
            </span>
        }
      </div>
    </div>
  )
}

interface ISideBarIcon {
  handle; // on click
  icon: string; // icon class
  active: boolean; // is currently expanded ?
  id: string; // unused, id for this element for debugging access
  name: string; // name of entry
}

const SideBarIcon = ({ handle, icon, active, id, name }) => {
  return (
    <div
      class={'sidebar-i waves-effect waves-light' + (active ? ' active' : '')}
      id={'sbi-' + id}
      onClick={handle}
    >
      <i class={icon}></i>
      <span>{name}</span>
    </div>
  )
}

const SideBar = ({ handler, editorState }: IEditorComponent) => {
  const sideBarEntries = [
    {
      id: SidebarModes.Select,
      name: R.selection,
      icon: 'gg-assign',
      condition: () => editorState.hasActiveSelection,
    },
    {
      id: SidebarModes.World,
      name: R.world,
      icon: 'gg-globe-alt',
    },
    {
      id: SidebarModes.Players,
      name: R.players,
      icon: 'gg-user-list',
    },
    {
      id: SidebarModes.Import,
      name: R.import,
      icon: 'gg-import',
    },
    {
      id: SidebarModes.Filter,
      name: R.filter,
      icon: 'gg-brush',
    },
    {
      id: SidebarModes.Plugins,
      name: R.plugins,
      icon: 'gg-add-r'
    },
    {
      id: SidebarModes.Exit,
      name: 'Exit',
      icon: 'gg-home'
    }
  ]

  return (
    <div class="sidebar-icons">
      {sideBarEntries.map((v, k) => {
        if (v.condition && !v.condition()) return
        return <SideBarIcon
          icon={v.icon}
          name={v.name}
          active={editorState.sidebarMode == v.id}
          id={v.id}
          handle={() => handler(H.ExpandSidebar, v.id)}
        />
      })}
    </div>
  )
}

const SideBarExpanded = (props) => {
  const { handler, editorState }: IEditorComponent = props
  let child
  switch (editorState.sidebarMode) {
    case SidebarModes.World:
      child = <WorldBar {...props} />
      break
    case SidebarModes.Players:
      child = <PlayerBar {...props} />
      break
    default:
      child = <TeapotBar {...props} />
      break
  }

  return (
    <div class="sidebar-expanded">
      {child}
    </div>
  )
}

export class EditorView extends Component<any, IEditorState> {

  constructor(...args) {
    super(...args)
    this.state = {
      renderDistance: 4,
      viewerDimension: 'Overworld',

      showingPalette: false,

      sidebarMode: SidebarModes.Hidden,

      hasForwardHistory: false,
      hasBackwardHistory: false,

      historySize: undefined,

      hasActiveSelection: false,
      hasActiveBrush: false
    }
  }

  stateController = (action: H, ...args) => {
    console.log('Requested', H[action])
    if (action == H.ExpandSidebar) {
      console.log(' -> ', SidebarModes[args[0]])

      const newMode = args[0]

      if (this.state.sidebarMode == newMode) {
        this.setState({ sidebarMode: SidebarModes.Hidden })
      } else {
        this.setState({ sidebarMode: args[0] })
      }

      if (newMode == SidebarModes.Exit) {
        ipcRenderer.send('OpenMain')
      }
    } else if (action == H.EditViewDistance) {
      this.setState({ showingPalette: !this.state.showingPalette })
    }
  }

  render() {
    console.log('rendered!')

    const childProps = {
      handler: this.stateController,
      editorState: this.state
    }

    return <Fragment>
      {
        this.state.showingPalette ? <PaletteComponent /> : null
      }
      <TopBar {...childProps} />
      <SideBar {...childProps} />
      {
        this.state.sidebarMode == SidebarModes.Hidden ?
          null : <SideBarExpanded {...childProps} />
      }
    </Fragment>
  }
}

render(<EditorView />, document.querySelector('#app'))