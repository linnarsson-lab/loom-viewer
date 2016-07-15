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
import { DataSetViewMetadata } from './dataset-viewmetadata';
import { CreateDataSet } from './dataset-upload';
import { HeatmapView } from './heatmap-view';
import { SparklineView } from './sparkline-view';
import { LandscapeView } from './landscape-view';
import { GenescapeView } from './genescape-view';

// layout of the routes
const Routes = (
	<Provider store={store}>
		<Router history={history}>
			<Route path='/' component={NavbarView}>
				<IndexRoute component={MainView} />
				<Route path='/dataset' component={DataSetView}>
					<Route path='/dataset/:transcriptome/:project/:dataset' component={DataSetViewMetadata}></Route>
					<Route path='/dataset/:transcriptome/:project/:dataset/heatmap' component={HeatmapView}></Route>
					<Route path='/dataset/:transcriptome/:project/:dataset/sparkline' component={SparklineView}></Route>
					<Route path='/dataset/:transcriptome/:project/:dataset/landscape' component={LandscapeView}></Route>
					<Route path='/dataset/:transcriptome/:project/:dataset/genescape' component={GenescapeView}></Route>
				</Route>
				<Route path='/upload' component={CreateDataSet}/>
			</Route>
		</Router>
	</Provider>
);

export default Routes;