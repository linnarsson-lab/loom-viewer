
import React, { Component, PropTypes } from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware } from 'redux'
import { Provider, connect } from 'react-redux';
import thunk from 'redux-thunk';
import loomAppReducer from './reducers'
import { Navbar } from './navbar';
import { HeatmapView } from './heatmap-view';
import { SparklineView } from './sparkline-view';
import { LandscapeView } from './landscape-view';
import { GenescapeView } from './genescape-view';
import { fetchGene } from './actions.js';

// create a store that has redux-thunk middleware enabled
let store = applyMiddleware(thunk)(createStore)(loomAppReducer);


class App extends Component {
  	render() {
		// Injected by connect() call:
		const dispatch = this.props.dispatch;
		const ds = this.props.dataState;
		const fi = this.props.fileInfo;
		const hs = this.props.heatmapState;
		const ss = this.props.sparklineState;
		const ls = this.props.landscapeState;
		const gs = this.props.genescapeState;
		const vs = this.props.viewState;

		var view = <div></div>;

		switch(this.props.viewState.view) {
			case "Heatmap":
				view =
					<HeatmapView 
						dataState={ds}
						heatmapState={hs}
						fileInfo={fi}
						dispatch={dispatch}
					/>
				break;
			case "Sparkline":
				view =
					<SparklineView 
						dataState={ds}
						sparklineState={ss}
						fileInfo={fi}
						dispatch={dispatch}
					/>
				break;
			case "Landscape":
				view = <LandscapeView
					dataState={ds}
					landscapeState={ls}
					fileInfo={fi}
					dispatch={dispatch}
				/>
				break;
			case "Genescape":
				view = <GenescapeView
					dataState={ds}
					genescapeState={gs}
					fileInfo={fi}
					dispatch={dispatch}
				/>
				break;
			default:
				view = <div>{"Unknown view: " + this.props.viewState.view}</div>;		
				break;
		}
		return (
			<div>
				<Navbar 
					fileName={fi.fileName}
					viewState={vs.view}

					onSetViewState={(state)=>dispatch({type: 'SET_VIEW_STATE', state: state})}
				/>
				{view}
			</div>
		);
	}
}
App.propTypes = {
	dataState: PropTypes.object,
	heatmapState: PropTypes.object,
	landscapeState: PropTypes.object,
	genescapeState: PropTypes.object,
	fileInfo: PropTypes.object,
	viewState: PropTypes.object
}

// Which props do we want to inject, given the global state?
// Note: use https://github.com/faassen/reselect for better performance.
function select(state) {
	return state
}

// Wrap the component to inject dispatch and state into it
App = connect(select)(App)



render(
	<Provider store={store}>
		<App/>
	</Provider>
, document.getElementById('react-root'));
