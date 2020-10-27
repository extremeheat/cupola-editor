import { Component, Fragment, h, render } from "preact";
import { R } from "../../main/Strings";
import { IEditorComponent } from "../editor";


export class PlayerBar extends Component {
  render(props) { // can't destructure here else TS complains :(
    let { handler, editorState }: IEditorComponent = props;

    return (
      <div class="wrapper">
        <ul>
          <li>
            <input style='width: 100%;padding-left: 0;padding-right: 0;' type="text" class='my-input' placeholder="Search for a player" />
          </li>

          <li>
            <input class="collapsible" type="checkbox" id="list-item-a1" />
            <label
              class="c-label playerbox"
              for="list-item-a1"
              style="color: white"
            >
              <div>
                ⮞
        <img
                  style="height: 32px; width: 32px; display: inline-block; vertical-align: middle;"
                  src="https://static.wikia.nocookie.net/minecraft/images/2/29/HeadsZ.gif/revision/latest?cb=20190322094900"
                />
        MyPlayer
      </div>
              <div style="font-size: x-small">
                cac41f5c-3f0b-4366-b98a-96b2571419b2
      </div>
              <div style="font-size: small">2 days ago</div>
            </label>
            <ul class="pushed" style="text-align: center">
              <div style="padding: 10px;">
                <b>Position</b>: -12, +24, -365
      </div>
              <button class='btn'>Edit player position</button>
              <button class='btn'>Edit player inventory</button>
            </ul>
          </li>
        </ul>
      </div>
    )
  }
}