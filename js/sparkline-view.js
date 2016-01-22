import React, { Component, PropTypes } from 'react';
import { Heatmap } from './heatmap';
import { SparklineSidepanel } from './sparkline-sidepanel';
import { Sparkline } from './sparkline';
import * as _ from 'lodash';
import { fetchGene } from './actions.js';


export class SparklineView extends Component {
  render() {
  	var fi = this.props.fileInfo;
  	var ss = this.props.sparklineState;
  	var ds = this.props.dataState;
  	var dispatch = this.props.dispatch;

  	var colData = fi.colAttrs[ss.colAttr];
  	// Figure out the ordering
	var indices = new Array(colData.length);
	for (var i = 0; i < colData.length; ++i) indices[i] = i;
	if(ss.orderByAttr != "(unordered)") {
	  	var orderBy = fi.colAttrs[ss.orderByAttr];

		indices.sort(function (a, b) { return orderBy[a] < orderBy[b] ? -1 : orderBy[a] > orderBy[b] ? 1 : 0; });
	}

	// Order the column attribute values
	var temp = new Array(colData.length);
	for (var i = 0; i < colData.length; ++i) temp[i] = colData[indices[i]];
	colData = temp;
	
  	var genes = ss.genes.trim().split(/[ ,\r\n]+/);
  	if(genes.length > 0 && genes[0] != "") {
	  	var geneSparklines = _.map(genes, (gene)=>{
	  		if(ds.genes.hasOwnProperty(gene)) {
	  			var geneData = new Array(colData.length);
				for (var i = 0; i < geneData.length; ++i) geneData[i] = ds.genes[gene][indices[i]];

				return (
					<div key={gene}>
						<Sparkline 
							orientation="horizontal"
							width={600}
							height={20}
							data={geneData}
							dataRange={[0, colData.length]}
							screenRange={[0,600]}
							mode={ss.geneMode}
						/>
						{gene}
					</div>
				);	  			
	  		} else {
				return <div key={gene}></div>;
	  		}
	  	});  		
  	} else {
  		var geneSparklines = <div></div>;
  	}

	return (
		<div className="container-fluid">
			<div className="row">
				<div className="col-xs-6 col-sm-3">
					<SparklineSidepanel 
						sparklineState={ss}
						dataState={ds}
						fileInfo={fi}
						dispatch={dispatch}
					/>
				</div>
				<div className="col-xs-12 col-sm-9 no-line-space">
					{/* We're borrowing the Leaflet zoom buttons 
				  	<div className="leaflet-top leaflet-left">
						<div className="leaflet-control-zoom leaflet-bar leaflet-control">
							<a className="leaflet-control-zoom-in" title="Zoom in">+</a>
							<a className="leaflet-control-zoom-out leaflet-disabled" title="Zoom out">-</a>
						</div>
					</div>				*/}
					<Sparkline 
						orientation="horizontal"
						width={600}
						height={20}
						data={colData}
						dataRange={[0, colData.length]}
						screenRange={[0,600]}
						mode={ss.colMode}
					/>
					{ss.colAttr}
					<div>
						{geneSparklines}
					</div>
				</div>
			</div>
		</div>
	)
  }
}

SparklineView.propTypes = {
	dataState: 				PropTypes.object.isRequired,
	sparklineState: 		PropTypes.object.isRequired,
	fileInfo: 				PropTypes.object.isRequired,
	dispatch: 				PropTypes.func.isRequired
}
