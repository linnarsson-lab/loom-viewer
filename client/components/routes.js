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

// layout of the routes
const Routes = (
	<Provider store={store}>
		<Router history={history}>
			<Route name='home' component={NavbarView}
				path='/'>
				<IndexRoute component={DataSetView} />
				<Route name='data-set-list' component={DataSetView}
					path='/datasets' />
				<Route name='data-set-heatmap' component={HeatmapView}
					path='/view/heatmap/:transcriptome/:project/:dataset(/:viewsettings)' />
				<Route name='data-set-sparkline' component={SparklineView}
					path='/view/sparkline/:transcriptome/:project/:dataset(/:viewsettings)' />
				<Route name='data-set-landscape' component={LandscapeView}
					path='/view/landscape/:transcriptome/:project/:dataset(/:viewsettings)' />
				<Route name='data-set-genescape' component={GenescapeView}
					path='/view/genescape/:transcriptome/:project/:dataset(/:viewsettings)' />
			</Route>
		</Router>
	</Provider>
);

export default Routes;