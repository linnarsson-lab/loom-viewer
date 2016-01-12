import React, { Component, PropTypes } from 'react';

export class HeatmapSidepanel extends Component {
	render() {
		var colOptions = Object.keys(this.props.colAttrs).sort().map((name)=> {
			return <option key={name}>{name}</option>;
		});
		var rowOptions = Object.keys(this.props.rowAttrs).sort().map((name)=> {
			return <option key={name}>{name}</option>;
		});
		var showOptionsForRows = ["as Text", "as Quantities", "as Categories"].map((name)=> {
			return <option key={name}>{name}</option>;
		});
		var showOptionsForCols = ["as Text", "as Quantities", "as Categories"].map((name)=> {
			return <option key={name}>{name}</option>;
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
	*/}			<div className="form-group">
					<label>Show cell attribute</label>
					<select className="form-control" value={this.props.selectedColAttr} onChange={(event)=>{this.props.onColAttrChange(event.target.value)}}>
						{colOptions}
					</select>
					<select className="form-control" value={"as " + this.props.selectedColMode} onChange={(event)=>{this.props.onColModeChange(event.target.value.substr(3))}}>
						{showOptionsForCols}
					</select>
				</div>
				<div className="form-group">
					<label>Show gene attribute</label>
					<select className="form-control" value={this.props.selectedRowAttr} onChange={(event)=>{this.props.onRowAttrChange(event.target.value)}}>
						{rowOptions}
					</select>
					<select className="form-control" value={"as " + this.props.selectedRowMode} onChange={(event)=>{this.props.onRowModeChange(event.target.value.substr(3))}}>
						{showOptionsForRows}
					</select>
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
	selectedColAttr: 	PropTypes.string.isRequired,
	selectedColMode: 	PropTypes.string.isRequired,
	genesToFind: 		PropTypes.string.isRequired,
	onFindGenes: 		PropTypes.func.isRequired,
	onRowAttrChange: 	PropTypes.func.isRequired,
	onColAttrChange: 	PropTypes.func.isRequired,
	onRowModeChange: 	PropTypes.func.isRequired,
	onColModeChange: 	PropTypes.func.isRequired
}