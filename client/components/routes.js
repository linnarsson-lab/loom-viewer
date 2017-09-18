import React from 'react';

// import Router dependencies
import {
	Router,
	Route,
	IndexRoute,
	browserHistory,
} from 'react-router';

// import Redux deps
import { Provider } from 'react-redux';
import { store } from '../store';

// Components
import { NavbarView } from './navbar';
import { DataSetList } from './dataset-list/dataset-list';
import { HeatmapView } from './heatmap/heatmap-view';
import { SparklineView } from './sparkline/sparkline-view';
import { LandscapeView } from './scatterplot/landscape-view';
import { GenescapeView } from './scatterplot/genescape-view';
import { GeneMetadataView } from './metadata/geneMD-view';
import { CellMetadataView } from './metadata/cellMD-view';

// layout of the routes
const Routes = (
	<Provider store={store}>
		<Router history={browserHistory}>
			<Route name='home' component={NavbarView}
				path='/'>
				<IndexRoute component={DataSetList} />
				<Route name='data-set-list' component={DataSetList}
					path='/dataset' />
				<Route name='data-set-heatmap' component={HeatmapView}
					path='/dataset/heatmap/:project/:filename(/:viewStateURI)' />
				<Route name='data-set-sparklines' component={SparklineView}
					path='/dataset/sparklines/:project/:filename(/:viewStateURI)' />
				<Route name='data-set-cells' component={LandscapeView}
					path='/dataset/cells/:project/:filename(/:viewStateURI)' />
				<Route name='data-set-genescape' component={GenescapeView}
					path='/dataset/genes/:project/:filename(/:viewStateURI)' />
				<Route name='data-set-gene-metadata' component={GeneMetadataView}
					path='/dataset/genemetadata/:project/:filename(/:viewStateURI)' />
				<Route name='data-set-cell-metadata' component={CellMetadataView}
					path='/dataset/cellmetadata/:project/:filename(/:viewStateURI)' />
			</Route>
		</Router>
	</Provider>
);

export default Routes;