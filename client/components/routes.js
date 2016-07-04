import React from 'react';
import { Route, IndexRoute } from 'react-router';

// Components
import { Navbar } from './navbar';
import { DatasetView } from './dataset-view';
import { DatasetViewMetadata } from './dataset-viewmetadata.js';
import { CreateDataset } from './dataset-upload.js';
import { HeatmapView } from './heatmap-view';
import { SparklineView } from './sparkline-view';
import { LandscapeView } from './landscape-view';
import { GenescapeView } from './genescape-view';

module.exports = (
	<Route path='/' component={Navbar}>
		<IndexRoute component={DatasetView}/>
		<Route path='/dataset' component={DatasetView}>
			<Route path='/dataset/:transcriptome/:project/:dataset' component={DatasetViewMetadata}/>
			<Route path='/dataset/:transcriptome/:project/:dataset/heatmap' component={HeatmapView}/>
			<Route path='/dataset/:transcriptome/:project/:dataset/sparkline' component={SparklineView}/>
			<Route path='/dataset/:transcriptome/:project/:dataset/landscape' component={LandscapeView}/>
			<Route path='/dataset/:transcriptome/:project/:dataset/genescape' component={GenescapeView}/>
		</Route>
		<Route path='upload' component={CreateDataset}/>
	</Route>
);