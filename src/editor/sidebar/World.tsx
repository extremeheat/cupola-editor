import { Component, Fragment, h, render } from "preact";
import { R } from "../../main/Strings";
import { IEditorComponent } from "../editor";

export class WorldBar extends Component<IEditorComponent> {
	render({ handler, editorState }: IEditorComponent) {
		return (
			<div class="wrapper">
				<ul>
					<li>
						<input class="collapsible" type="checkbox" id="list-item-1" />
						<label class="c-label" for="list-item-1">⮟ Minimap</label
						>
						<ul style="display: flex; justify-content: center">
							<img
								src="https://i.imgur.com/TGING6d.png"
								style="width: 100%; max-width: 400px; border: 0px solid black"
							/>
						</ul>
					</li>
					<li>
						<input class="collapsible" type="checkbox" id="list-item-2" />
						<label class="c-label" for="list-item-2">⮞ Level Properties</label>
						<ul class="pushed">
							<li>
								<div style="padding-top: 8px">
									<input id="allow-commands" type="checkbox" />
									<label for="allow-commands">Allow commands</label>
								</div>
							</li>
							<div class="rowable">
								<li>
									<p>Border X</p>
									<input class='my-input' type="number" />
								</li>
								<li>
									<p>Border Y</p>
									<input class='my-input' type="number" />
								</li>
								<li>
									<p>Border Z</p>
									<input class='my-input' type="number" />
								</li>
							</div>

							<li>Oswald</li>
						</ul>
					</li>
					<li>
						<input class="collapsible" type="checkbox" id="list-item-3" />
						<label class="c-label" for="list-item-3">⮞ Level Data</label>
						<ul>
							<button class='btn'>Edit entities</button>
							<button class='btn'>Edit block entities</button>
							<button class='btn'>Edit level NBT</button>
						</ul>
					</li>
				</ul>
			</div>
		);
	}
}