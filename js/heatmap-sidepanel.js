import React, { Component, PropTypes } from 'react';

export class HeatmapSidepanel extends Component {
	render() {
		var dispatch = this.props.dispatch;
		var fi = this.props.fileInfo;
		var hs = this.props.heatmapState;

		var temp = Object.keys(fi.colAttrs).sort();
		temp.push("(gene)");
		var colOptions = temp.map((name)=> {
			return <li key={name}><a onClick={(event)=>dispatch({ 
							type: 'SET_HEATMAP_PROPS', 
							colAttr: name
						})}>{name}</a></li>;
		});
		var temp = Object.keys(fi.rowAttrs).sort();
		temp.push("(gene positions)");
		var rowOptions = temp.map((name)=> {
			return <li key={name}><a onClick={(event)=>dispatch({ 
							type: 'SET_HEATMAP_PROPS', 
							rowAttr: name
						})}>{name}</a></li>;
		});
		var showOptionsForRows = ["Text", "Bars", "Quantitative", "Categorical"].map((name)=> {
			return <li key={name}><a onClick={(event)=>dispatch({ 
							type: 'SET_HEATMAP_PROPS', 
							rowMode: name
						})}>{name}</a></li>;
		});
		var showOptionsForCols = ["Text", "Bars", "Quantitative", "Categorical"].map((name)=> {
			return <li key={name}><a onClick={(event)=>dispatch({ 
							type: 'SET_HEATMAP_PROPS', 
							colMode: name
						})}>{name}</a></li>;
		});

		return(
		  <div className="panel panel-default">
			<div className="panel-heading"><h3 className="panel-title">Settings</h3></div>
			<div className="panel-body">
			  <form>
	{/*			<div className="form-group">
					<label>Find genes</label>
					<input className="form-control" defaultValue={this.props.genesToFind} onChange={(event)=>{this.props.onFindGenes(event.target.value)}}/>
				</div>
	*/}
				<div className="form-group">
					<label>Show cell attribute</label>
					<div className="btn-group btn-block">
						<button type="button" className="btn btn-block btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
							{hs.colAttr + "  "}<span className="caret"></span>
						</button>
						<ul className="dropdown-menu btn-block scrollable-menu">
							{colOptions}
						</ul>
					</div>				
					<div className="btn-group btn-block">
						<button type="button" className="btn btn-block btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
							{hs.colMode + "  "}<span className="caret"></span>
						</button>
						<ul className="dropdown-menu btn-block scrollable-menu">
							{showOptionsForCols}
						</ul>
					</div>				
					<div className="btn-group btn-block">
						{hs.colAttr == "(gene)" ? 
							<inpiut className="form-control" placeholder="Gene" value={this.props.selectedColGene} onChange={(event)=>dispatch({ 
								type: 'SET_HEATMAP_PROPS', 
								colGene: event.target.value
							})}/> : 
							<span></span>
						}
					</div>
				</div>

				<div className="form-group">
					<label>Show gene attribute</label>
					<div className="btn-group btn-block">
						<button type="button" className="btn btn-block btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
							{hs.rowAttr + "  "}<span className="caret"></span>
						</button>
						<ul className="dropdown-menu btn-block scrollable-menu">
							{rowOptions}
						</ul>
					</div>				
					<div className="btn-group btn-block">
						{hs.rowAttr == "(gene positions)" ? 
							<textarea className="form-control" placeholder="Genes" value={this.props.selectedRowGenes} onChange={(event)=>dispatch({ 
								type: 'SET_HEATMAP_PROPS', 
								rowGenes: event.target.value
							})}/> : 
						<div>
							<button type="button" className="btn btn-block btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
								{hs.rowMode + "  "}<span className="caret"></span>
							</button>
							<ul className="dropdown-menu btn-block scrollable-menu">
								{showOptionsForRows}
							</ul>
						</div>
						}
					</div>
				</div>
			  </form>            
			</div>
		  </div>
	  	);
	}
}

HeatmapSidepanel.propTypes = {
	heatmapState: PropTypes.object.isRequired,
	fileInfo: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired
}