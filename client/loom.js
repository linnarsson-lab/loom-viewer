import React, { Component, PropTypes } from 'react';
import { render } from 'react-dom';

// Components
import { MainView } from './components/main-view';
import { NavbarView } from './components/navbar';
import { DataSetView } from './components/dataset-view';
import { DataSetViewMetadata } from './components/dataset-viewmetadata';
import { CreateDataSet } from './components/dataset-upload';
import { HeatmapView } from './components/heatmap-view';
import { SparklineView } from './components/sparkline-view';
import { LandscapeView } from './components/landscape-view';
import { GenescapeView } from './components/genescape-view';



// import Bootstrap Grid components
import { Grid, Row, Col } from 'react-bootstrap';

// import Router dependencies
import { Router, Route, IndexRoute } from 'react-router';

// import Redux deps
import { Provider } from 'react-redux';
import store, { history } from './store';


// layout of the routes
const router = (
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

render(router, document.getElementById('react-root'));


// Fetch logic from opening a dataset needs to move to Router & Redux, commented
// out for later reference for now.
// <div
// 	key={key}
// 	className={'list-group-item' + (isCurrent ? ' list-group-item-info' : '') }>
// 	<a onClick={
// 		() => {
// 			const ds = state.transcriptome + '__' + state.proj + '__' + state.dataset;
// 			dispatch(fetchDataset(ds));
// 		}
// 	}>
// 		{state.dataset}
// 	</a>
// 	<span>{' ' + state.message}</span>
// </div>