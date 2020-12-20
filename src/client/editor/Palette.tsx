import { Component, Fragment, h, render } from "preact";
declare var PaletteCommand;

export class PaletteComponent extends Component {
    palette;

    constructor(props) {
        super(props);
        this.palette = new PaletteCommand();
        // @ts-ignore
        window.pal = this.palette;
    }

    componentDidMount() {
        console.warn('Showing palette!')
        let cats = [];
        for (var i = 1; i < 9; i++) {
            cats.push({
                name: i,
                description: "View Distance",
            });
        }

        this.palette.setCategory(cats);
        // allow render time...
        setTimeout(() => {
            this.palette.show();            
        }, 100);
    }

    componentWillUnmount() {
        this.palette.hide();
    }

    render() {
        return (
            <Fragment>
            </Fragment>
        );
    }
}
