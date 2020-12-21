import { Component, Fragment, h, render } from 'preact'
import { HomeScreen } from './main2'


class AppContainer extends Component {
  render() {
    console.log('rendered!')
    return (
      <Fragment>
        <HomeScreen />
      </Fragment>
    )
  }
}

render(<AppContainer />, document.querySelector('#app'))