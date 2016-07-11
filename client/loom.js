import React, { Component, PropTypes } from 'react';
import { render } from 'react-dom';

// Components
import { MainView } from './components/main-view';
import { NavbarView } from './components/navbar';
import { DatasetView } from './components/dataset-view';
import { DatasetViewMetadata } from './components/dataset-viewmetadata';
import { CreateDataset } from './components/dataset-upload';
import { HeatmapView } from './components/heatmap-view';
import { SparklineView } from './components/sparkline-view';
import { LandscapeView } from './components/landscape-view';
import { GenescapeView } from './components/genescape-view';

// import Redux deps
import { Provider } from 'react-redux';
import store, { history } from './store';

// import Router dependencies
import { Router, Route, IndexRoute } from 'react-router';

// layout of the routes
const router = (
	<Provider store={store}>
		<Router history={history}>
			<Route path='/' component={NavbarView}>
				<IndexRoute component={MainView}></IndexRoute>
				<Route path='/dataset' component={DatasetView}>
					<Route path='/dataset/:transcriptome/:project/:dataset' component={DatasetViewMetadata}></Route>
					<Route path='/dataset/:transcriptome/:project/:dataset/heatmap' component={HeatmapView}></Route>
					<Route path='/dataset/:transcriptome/:project/:dataset/sparkline' component={SparklineView}></Route>
					<Route path='/dataset/:transcriptome/:project/:dataset/landscape' component={LandscapeView}></Route>
					<Route path='/dataset/:transcriptome/:project/:dataset/genescape' component={GenescapeView}></Route>
				</Route>
				<Route path='/upload' component={CreateDataset}/>
			</Route>
		</Router>
	</Provider>
);

render(router, document.getElementById('react-root'));