import React, { Component, PropTypes } from 'react';
import * as _ from 'lodash';
import { fetchGene } from './actions.js';

export class SparklineSidepanel extends Component {
	render() {
		var dispatch = this.props.dispatch;
		var ss = this.props.sparklineState;	
		var fi = this.props.fileInfo;
		var ds = this.props.dataState;

		var colOptions = Object.keys(fi.colAttrs).sort().map((name)=> {
			return (
				<li key={name}>
					<a onClick={(event)=>dispatch({ 
						type: 'SET_SPARKLINE_PROPS', 
						colAttr: name
					})}>
					{name}
					</a>
				</li>
			);
		});

		var temp = Object.keys(fi.colAttrs).sort();
		temp.push("(unordered)");
		var orderByOptions = temp.map((name)=> {
			return (
				<li key={name}>
					<a onClick={(event)=>dispatch({ 
						type: 'SET_SPARKLINE_PROPS', 
						orderByAttr: name
					})}>
					{name}
					</a>
				</li>
			);
		});
		var optionsForCols = ["Text", "Bars", "Heatmap", "Categorical"].map((name)=> {
			return (
				<li key={name}>
					<a onClick={(event)=>dispatch({ 
						type: 'SET_SPARKLINE_PROPS', 
						colMode: name
					})}>
					{name}
					</a>
				</li>
			);
		});
		var optionsForGenes = ["Bars", "Heatmap"].map((name)=> {
			return (
				<li key={name}>
					<a onClick={(event)=>dispatch({ 
						type: 'SET_SPARKLINE_PROPS', 
						geneMode: name
					})}>
					{name}
					</a>
				</li>
			);
		});

		return(
		  <div className="panel panel-default">
			<div className="panel-heading"><h3 className="panel-title">Settings</h3></div>
			<div className="panel-body">
			  <form>

				<div className="form-group">
					<label>Order by</label>
					<div className="btn-group btn-block">
						<button type="button" className="btn btn-block btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
							{ss.orderByAttr + "  "}<span className="caret"></span>
						</button>
						<ul className="dropdown-menu btn-block scrollable-menu">
							{orderByOptions}
						</ul>
					</div>				
				</div>

				<div className="form-group">
					<label>Show cell attribute</label>
					<div className="btn-group btn-block">
						<button type="button" className="btn btn-block btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
							{ss.colAttr + "  "}<span className="caret"></span>
						</button>
						<ul className="dropdown-menu btn-block scrollable-menu">
							{colOptions}
						</ul>
					</div>				
					<div className="btn-group btn-block">
						<button type="button" className="btn btn-block btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
							{ss.colMode + "  "}<span className="caret"></span>
						</button>
						<ul className="dropdown-menu btn-block scrollable-menu">
							{optionsForCols}
						</ul>
					</div>		
				</div>

				<div className="form-group">
					<label>Show genes</label>
					<textarea className="form-control" rows="5" value={ss.genes} onChange={(event)=>{
						dispatch({ type: 'SET_SPARKLINE_PROPS', genes: event.target.value });
						_.forEach(event.target.value.trim().split(/[ ,\r\n]+/), (gene)=>{
							dispatch(fetchGene(fi.rowAttrs, gene, ds.genes));
						})
					}}>
					</textarea>
				</div>				


				<div className="form-group">
					<div className="btn-group btn-block">
						<button type="button" className="btn btn-block btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
							{ss.geneMode + "  "}<span className="caret"></span>
						</button>
						<ul className="dropdown-menu btn-block scrollable-menu">
							{optionsForGenes}
						</ul>
					</div>		
				</div>
			  </form>            
			</div>
		  </div>
	  	);
	}
}

SparklineSidepanel.propTypes = {
	sparklineState: PropTypes.object.isRequired,
	dataState: PropTypes.object.isRequired,
	fileInfo: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired
}