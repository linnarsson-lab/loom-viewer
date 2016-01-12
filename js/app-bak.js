import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import { setHeatmapBounds } from './actions'
import { Heatmap } from './heatmap';

class App extends Component {
  render() {
    // Injected by connect() call:
    const { dispatch, heatmapBounds } = this.props;
    return (
      <Heatmap
        pixelHeight={4980736}
        pixelWidth={4653056}
        onViewChanged={(bounds)=>dispatch(setHeatmapBounds(bounds))}
      />
    )
  }
}

App.propTypes = {
  heatmapBounds: PropTypes.object.isRequired
}


// Which props do we want to inject, given the global state?
// Note: use https://github.com/faassen/reselect for better performance.
function select(state) {
  return {
    heatmapBounds: state.heatmapBounds
  }
}

// Wrap the component to inject dispatch and state into it
export default connect(select)(App)