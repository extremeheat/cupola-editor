import { Component, Fragment, h, render } from 'preact'
import { R } from 'main/Strings'
import { H, IEditorComponent } from '../editor'

export class TeapotBar extends Component<IEditorComponent> {
  render({ handler, editorState }: IEditorComponent) {

    const styleDemo = `
			height: 100%;
			width: 100%;
			background-image: url(https://images-na.ssl-images-amazon.com/images/I/61FlY3Iso0L._AC_SL1500_.jpg);
			background-size: contain;
			opacity: 0.5;
		`

    return (
      <div class="wrapper" style={styleDemo}>
        <ul>
          {
            Array(40).fill(
              <li style='background-color:#00000080'>
								This is a placeholder. The page ({H[editorState.sidebarMode]}) doesn't exist right now.
								This is a sidebar extension demo. You can resize the canvas at the bottom right to see how
								it affects the sidebar.
              </li>
            )
          }

        </ul>
      </div>
    )
  }
}