
import React, { Component, PropTypes } from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware } from 'redux'
import { Provider, connect } from 'react-redux';
import thunk from 'redux-thunk';
import loomAppReducer from './reducers'
import { Navbar } from './navbar';
import { DatasetView } from './dataset-view';
import { HeatmapView } from './heatmap-view';
import { SparklineView } from './sparkline-view';
import { LandscapeView } from './landscape-view';
import { GenescapeView } from './genescape-view';
import { fetchProjects } from './actions.js';

// create a store that has redux-thunk middleware enabled
let store = applyMiddleware(thunk)(createStore)(loomAppReducer);


class App extends Component {
   	componentDidMount() {
   		var dispatch = this.props.dispatch;
		window.addEventListener("resize", ()=>{
			dispatch(
				{
					type: 'SET_VIEW_PROPS', 
					width: document.getElementById("react-root").clientWidth, 
					height: window.innerHeight - document.getElementById("react-root").offsetTop
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
		const dispatch = this.props.dispatch;
		const ds = this.props.dataState;
		const hs = this.props.heatmapState;
		const ss = this.props.sparklineState;
		const ls = this.props.landscapeState;
		const gs = this.props.genescapeState;
		const vs = this.props.viewState;

		var view = <div></div>;

		switch(this.props.viewState.view) {
			case "Dataset":
				view =
					<DatasetView 
						viewState={vs}
						dataState={ds}
						heatmapState={hs}
						dispatch={dispatch}
					/>
				break;
			case "Heatmap":
				view =
					<HeatmapView 
						viewState={vs}
						dataState={ds}
						heatmapState={hs}
						dispatch={dispatch}
					/>
				break;
			case "Sparkline":
				view =
					<SparklineView 
						viewState={vs}
						dataState={ds}
						sparklineState={ss}
						dispatch={dispatch}
					/>
				break;
			case "Landscape":
				view = <LandscapeView
					viewState={vs}
					dataState={ds}
					landscapeState={ls}
					dispatch={dispatch}
				/>
				break;
			case "Genescape":
				view = <GenescapeView
					viewState={vs}
					dataState={ds}
					genescapeState={gs}
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
					viewState={vs}
					dataState={ds}
					onSetViewState={(state)=>
						{
							if(ds.hasDataset) {
								dispatch({type: 'SET_VIEW_PROPS', view: state});
							}
						}
					}

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
