import React, { Component, PropTypes } from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import { Provider, connect } from 'react-redux';
import thunk from 'redux-thunk';
import loomAppReducer from './reducers/reducers';
import { Navbar } from './components/navbar';
import { DatasetView } from './components/dataset-view';
import { HeatmapView } from './components/heatmap-view';
import { SparklineView } from './components/sparkline-view';
import { LandscapeView } from './components/landscape-view';
import { GenescapeView } from './components/genescape-view';
import { fetchProjects } from './actions/actions.js';


// create a store that has redux-thunk middleware enabled
let store = applyMiddleware(thunk)(createStore)(loomAppReducer);


class App extends Component {
	componentDidMount() {
		const dispatch = this.props.dispatch;
		window.addEventListener("resize", () => {
			dispatch(
				{
					type: 'SET_VIEW_PROPS',
					width: document.getElementById("react-root").clientWidth,
					height: window.innerHeight - document.getElementById("react-root").offsetTop,
				}
			);
		});
		dispatch(fetchProjects());
	}

	componentWillUnmount() {
		// Should remove the resize event listener here, but since this component will never unmount, we don't bother
		// Because if we did bother, we'd need to figure out how to use 'this' in an event handler (again)
	}

	render() {
		// Injected by connect() call:
		const { dispatch, dataState, heatmapState, sparklineState, landscapeState, genescapeState, viewState } = this.props;

		let view = <div></div>;

		switch (this.props.viewState.view) {
		case "Dataset":
			view = <DatasetView
					viewState={viewState}
					dataState={dataState}
					dispatch={dispatch}
					/>;
			break;
		case "Heatmap":
			view = <HeatmapView
					viewState={viewState}
					dataState={dataState}
					heatmapState={heatmapState}
					dispatch={dispatch}
					/>;
			break;
		case "Sparkline":
			view = <SparklineView
					viewState={viewState}
					dataState={dataState}
					sparklineState={sparklineState}
					dispatch={dispatch}
					/>;
			break;
		case "Landscape":
			view = <LandscapeView
					viewState={viewState}
					dataState={dataState}
					landscapeState={landscapeState}
					dispatch={dispatch}
					/>;
			break;
		case "Genescape":
			view = <GenescapeView
					viewState={viewState}
					dataState={dataState}
					genescapeState={genescapeState}
					dispatch={dispatch}
					/>;
			break;
		default:
			view = <div>{"Unknown view: " + this.props.viewState.view}</div>;
			break;
		}
		return (
			<div>
				<Navbar
					viewState={viewState}
					dataState={dataState}
					onSetViewState={
						(state) => {
							dataState.hasDataset ? dispatch({ type: 'SET_VIEW_PROPS', view: state }) : undefined;
						}
					}/>
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
	viewState: PropTypes.object,
};

// Which props do we want to inject, given the global state?
// Note: use https://github.com/faassen/reselect for better performance.
function select(state) {
	return state;
}

// Wrap the component to inject dispatch and state into it
let LoomApp = connect(select)(App);

render(
	<Provider store={store}>
		<LoomApp />
	</Provider>
	, document.getElementById('react-root')
);
