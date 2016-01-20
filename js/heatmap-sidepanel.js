import React, { Component, PropTypes } from 'react';

export class HeatmapSidepanel extends Component {
	render() {
		var temp = Object.keys(this.props.colAttrs).sort();
		temp.push("(gene)");
		var colOptions = temp.map((name)=> {
			return <li key={name}><a onClick={(event)=>{this.props.onColAttrChange(name);}}>{name}</a></li>;
		});
		var temp = Object.keys(this.props.colAttrs).sort();
		temp.push("(gene positions)");
		var rowOptions = temp.map((name)=> {
			return <li key={name}><a onClick={(event)=>{this.props.onRowAttrChange(name);}}>{name}</a></li>;
		});
		var showOptionsForRows = ["Text", "Bars", "Quantitative", "Categorical"].map((name)=> {
			return <li key={name}><a onClick={(event)=>{this.props.onRowModeChange(name);}}>{name}</a></li>;
		});
		var showOptionsForCols = ["Text", "Bars", "Quantitative", "Categorical"].map((name)=> {
			return <li key={name}><a onClick={(event)=>{this.props.onColModeChange(name);}}>{name}</a></li>;
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
							{this.props.selectedColAttr + "  "}<span className="caret"></span>
						</button>
						<ul className="dropdown-menu btn-block scrollable-menu">
							{colOptions}
						</ul>
					</div>				
					<div className="btn-group btn-block">
						<button type="button" className="btn btn-block btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
							{this.props.selectedColMode + "  "}<span className="caret"></span>
						</button>
						<ul className="dropdown-menu btn-block scrollable-menu">
							{showOptionsForCols}
						</ul>
					</div>				
					<div className="btn-group btn-block">
						{this.props.selectedColAttr == "(gene)" ? 
							<inpiut className="form-control" placeholder="Gene" value={this.props.selectedColGene} onChange={(event)=>{this.props.onColGeneChange(event.target.value)}}/> : 
							<span></span>
						}
					</div>
				</div>

				<div className="form-group">
					<label>Show gene attribute</label>
					<div className="btn-group btn-block">
						<button type="button" className="btn btn-block btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
							{this.props.selectedRowAttr + "  "}<span className="caret"></span>
						</button>
						<ul className="dropdown-menu btn-block scrollable-menu">
							{rowOptions}
						</ul>
					</div>				
					<div className="btn-group btn-block">
						<button type="button" className="btn btn-block btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
							{this.props.selectedRowMode + "  "}<span className="caret"></span>
						</button>
						<ul className="dropdown-menu btn-block scrollable-menu">
							{showOptionsForRows}
						</ul>
					</div>	
					<div className="btn-group btn-block">
						{this.props.selectedRowAttr == "(gene positions)" ? 
							<textarea className="form-control" placeholder="Genes" value={this.props.selectedRowGenes} onChange={(event)=>{this.props.onRowGenesChange(event.target.value)}}/> : 
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

HeatmapSidepanel.propTypes = {
	rowAttrs: 			PropTypes.object.isRequired,
	colAttrs: 			PropTypes.object.isRequired,
	selectedRowAttr: 	PropTypes.string.isRequired,
	selectedRowMode: 	PropTypes.string.isRequired,
	selectedRowGenes: 	PropTypes.string.isRequired,
	selectedColAttr: 	PropTypes.string.isRequired,
	selectedColMode: 	PropTypes.string.isRequired,
	selectedColGene: 	PropTypes.string.isRequired,
	genesToFind: 		PropTypes.string.isRequired,
	onFindGenes: 		PropTypes.func.isRequired,
	onRowAttrChange: 	PropTypes.func.isRequired,
	onRowModeChange: 	PropTypes.func.isRequired,
	onRowGenesChange: 	PropTypes.func.isRequired,
	onColAttrChange: 	PropTypes.func.isRequired,
	onColGeneChange: 	PropTypes.func.isRequired,
	onColModeChange: 	PropTypes.func.isRequired
}