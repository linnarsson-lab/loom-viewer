import React from 'react';

// import Router dependencies
import { Router, Route, IndexRoute, browserHistory } from 'react-router';

// import Redux deps
import { Provider } from 'react-redux';
import { store } from '../store';

// Components
import { NavbarView } from './navbar';
//import { DataSetView } from './dataset-view';
import { DataSetList } from './dataset-list';
import { HeatmapView } from './heatmap-view';
import { SparklineView } from './sparkline-view';
import { LandscapeView } from './landscape-view';
import { GenescapeView } from './genescape-view';
import { GeneMetadataView } from './geneMD-view';
import { CellMetadataView } from './cellMD-view';

//import { ViolinPlotView } from './violinplot-view';

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
					path='/dataset/heatmap/:project/:filename(/:viewsettings)' />
				<Route name='data-set-sparklines' component={SparklineView}
					path='/dataset/sparklines/:project/:filename(/:viewsettings)' />
				<Route name='data-set-cells' component={LandscapeView}
					path='/dataset/cells/:project/:filename(/:viewsettings)' />
				<Route name='data-set-genescape' component={GenescapeView}
					path='/dataset/genes/:project/:filename(/:viewsettings)' />
				<Route name='data-set-gene-metadata' component={GeneMetadataView}
					path='/dataset/genemetadata/:project/:filename(/:viewsettings)' />
				<Route name='data-set-cell-metadata' component={CellMetadataView}
					path='/dataset/cellmetadata/:project/:filename(/:viewsettings)' />
			</Route>
		</Router>
	</Provider>
);

export default Routes;