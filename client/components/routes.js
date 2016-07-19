import React from 'react';

// import Router dependencies
import { Router, Route, IndexRoute } from 'react-router';

// import Redux deps
import { Provider } from 'react-redux';
import { store, history } from '../store';

// Components
import { MainView } from './main-view';
import { NavbarView } from './navbar';
import { DataSetView } from './dataset-view';
import { CreateDataSet } from './dataset-upload';
import { HeatmapView } from './heatmap-view';
import { SparklineView } from './sparkline-view';
import { LandscapeView } from './landscape-view';
import { GenescapeView } from './genescape-view';

// layout of the routes
const Routes = (
	<Provider store={store}>
		<Router history={history}>
			<Route name='main' path='/' component={NavbarView}>
				<IndexRoute component={MainView} />
				<Route name='data-set-list' path='/dataset(/:transcriptome/:project/:dataset)' component={DataSetView}>
					<Route name='data-set-heatmap' path='/dataset/:transcriptome/:project/:dataset/heatmap(/:viewsettings)' component={HeatmapView}></Route>
					<Route name='data-set-sparkline' path='/dataset/:transcriptome/:project/:dataset/sparkline(/:viewsettings)' component={SparklineView}></Route>
					<Route name='data-set-landscape' path='/dataset/:transcriptome/:project/:dataset/landscape(/:viewsettings)' component={LandscapeView}></Route>
					<Route name='data-set-genescape' path='/dataset/:transcriptome/:project/:dataset/genescape(/:viewsettings)' component={GenescapeView}></Route>
				</Route>
				<Route path='/upload' component={CreateDataSet} />
			</Route>
		</Router>
	</Provider>
);

export default Routes;