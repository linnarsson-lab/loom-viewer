import React, { Component, PropTypes } from 'react';
import { fetchGene } from './actions.js';



export class LandscapeSidepanel extends Component {
	render() {
		var start = performance.now();
		var temp = this.render0();
		console.log("Sidepanel: " + (performance.now() - start).toString());
		return temp;
	}
	render0() {
		var dispatch = this.props.dispatch;
		var fi = this.props.fileInfo;
		var ls = this.props.landscapeState;
		var ds = this.props.dataState;

		var temp = Object.keys(fi.colAttrs).sort();
		temp.push("(gene)");
		var xOptions = temp.map((name)=> {
			return <li key={name}>
				<a onClick={(event)=>dispatch({ 
						type: 'SET_LANDSCAPE_PROPS', 
						xCoordinate: name
					})}>
					{name}
				</a>
			</li>;
		});
		
		var temp = Object.keys(fi.colAttrs).sort();
		temp.push("(gene)");
		var yOptions = temp.map((name)=> {
			return <li key={name}><a onClick={(event)=>dispatch({ 
						type: 'SET_LANDSCAPE_PROPS', 
						yCoordinate: name
					})}>{name}</a></li>;
		});

		var temp = Object.keys(fi.colAttrs).sort();
		temp.push("(gene)");
		var colorOptions = temp.map((name)=> {
			return <li key={name}><a onClick={(event)=>dispatch({ 
						type: 'SET_LANDSCAPE_PROPS', 
						colorAttr: name
					})}>{name}</a></li>;
		});

		var isTSNE = (ls.xCoordinate == '_tSNE1') && (ls.yCoordinate == '_tSNE2');
		var isPCA = (ls.xCoordinate == '_PC1') && (ls.yCoordinate == '_PC2');

		return(
		  <div className="panel panel-default">
			<div className="panel-heading"><h3 className="panel-title">Settings</h3></div>
			<div className="panel-body">
				<form>
					<div className="form-group">
						<div className="btn-group btn-group-justified" role="group">
						  <div className="btn-group" role="group">
						    <button 
						    	type="button" 
						    	className={"btn" + (isTSNE ? " btn-success" : " btn-default")}
						    	onClick={(event)=>dispatch({ 
									type: 'SET_LANDSCAPE_PROPS', 
									xCoordinate: '_tSNE1',
									yCoordinate: '_tSNE2'
								})}
						    >tSNE</button>
						  </div>
						  <div className="btn-group" role="group">
						    <button 
						    	type="button" 
						    	className={"btn" + (isPCA ? " btn-success" : " btn-default")}
						    	onClick={(event)=>dispatch({ 
									type: 'SET_LANDSCAPE_PROPS', 
									xCoordinate: '_PC1',
									yCoordinate: '_PC2'
								})}						    	
						    >PCA</button>
						  </div>
						</div>
					</div>

					<div className="form-group">
						<label>X Coordinate</label>
						<div className="btn-group btn-block">
							<button type="button" className="btn btn-block btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
								{ls.xCoordinate + "  "}<span className="caret"></span>
							</button>
							<ul className="dropdown-menu btn-block scrollable-menu">
								{xOptions}
							</ul>
						</div>				
						<div className="btn-group btn-block">
						{ls.xCoordinate == "(gene)" ? 
							<input className="form-control" placeholder="Gene" value={ls.xGene} onChange={(event)=>{
								dispatch({ 
									type: 'SET_LANDSCAPE_PROPS', 
									xGene: event.target.value
								});
								dispatch(fetchGene(fi.rowAttrs, event.target.value, ds.genes));
							}}/> : 
							<span></span>
						}
						</div>
					</div>


					<div className="form-group">
						<label>Y Coordinate</label>
						<div className="btn-group btn-block">
							<button type="button" className="btn btn-block btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
								{ls.yCoordinate + "  "}<span className="caret"></span>
							</button>
							<ul className="dropdown-menu btn-block scrollable-menu">
								{yOptions}
							</ul>
						</div>				
						<div className="btn-group btn-block">
						{ls.yCoordinate == "(gene)" ? 
							<input className="form-control" placeholder="Gene" value={ls.yGene} onChange={(event)=>{
								dispatch({ 
									type: 'SET_LANDSCAPE_PROPS', 
									yGene: event.target.value
								});
								dispatch(fetchGene(fi.rowAttrs, event.target.value, ds.genes));
							}}/> : 
							<span></span>
						}
						</div>
					</div>

					<div className="form-group">
						<label>Color</label>
						<div className="btn-group btn-block">
							<button type="button" className="btn btn-block btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
								{ls.colorAttr + "  "}<span className="caret"></span>
							</button>
							<ul className="dropdown-menu btn-block scrollable-menu">
								{colorOptions}
							</ul>
						</div>
						<div className="btn-group btn-block">
							<button type="button" className="btn btn-block btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
								{ls.colorMode + "  "}<span className="caret"></span>
							</button>
							<ul className="dropdown-menu">
								<li key="Categorical"><a onClick={(event)=>dispatch({ 
									type: 'SET_LANDSCAPE_PROPS', 
									colorMode: 'Categorical'
								})}>Categorical</a></li>
								<li key="Heatmap"><a onClick={(event)=>dispatch({ 
									type: 'SET_LANDSCAPE_PROPS', 
									colorMode: 'Heatmap'
								})}>Quantitative</a></li>
							</ul>
						</div>
						<div className="btn-group btn-block">
						{ls.colorAttr == "(gene)" ? 
							<input className="form-control" placeholder="Gene" value={ls.colorGene} onChange={(event)=>{
								dispatch({ 
									type: 'SET_LANDSCAPE_PROPS', 
									colorGene: event.target.value
								});
								dispatch(fetchGene(fi.rowAttrs, event.target.value, ds.genes));
							}}/> : 
							<span></span>
						}
						</div>
					</div>
				</form>            
			</div>
		</div>
	  	);
	}

}

LandscapeSidepanel.propTypes = {
	landscapeState: 	PropTypes.object.isRequired,
	fileInfo: 			PropTypes.object.isRequired,
	dataState: 			PropTypes.object.isRequired
}