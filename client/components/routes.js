import React from 'react';

// import Router dependencies
import { Router, Route, IndexRoute } from 'react-router';

// import Redux deps
import { Provider } from 'react-redux';
import { store, history } from '../store';

// Components
import { NavbarView } from './navbar';
import { DataSetView } from './dataset-view';
import { HeatmapView } from './heatmap-view';
import { SparklineView } from './sparkline-view';
import { LandscapeView } from './landscape-view';
import { GenescapeView } from './genescape-view';

import { CanvasBenchmark } from './canvas';

// layout of the routes
const Routes = (
	<Provider store={store}>
		<Router history={history}>
			<Route name='home' component={NavbarView}
				path='/'>
				<IndexRoute component={DataSetView} />
				<Route name='data-set-list' component={DataSetView}
					path='/dataset' />
				<Route name='data-set-heatmap' component={HeatmapView}
					path='/dataset/heatmap/:project/:dataset(/:viewsettings)' />
				<Route name='data-set-sparklines' component={SparklineView}
					path='/dataset/sparklines/:project/:dataset(/:viewsettings)' />
				<Route name='data-set-cells' component={LandscapeView}
					path='/dataset/cells/:project/:dataset(/:viewsettings)' />
				<Route name='data-set-genescape' component={GenescapeView}
					path='/dataset/genes/:project/:dataset(/:viewsettings)' />
				<Route name='canvas-benchmark' component={CanvasBenchmark}
					path='/dataset/benchmark' />
			</Route>
		</Router>
	</Provider>
);

export default Routes;