import React, { Component, PropTypes } from 'react';

export class SparklineSidepanel extends Component {
	render() {
		var colOptions = Object.keys(this.props.colAttrs).sort().map((name)=> {
			return <option key={name}>{name}</option>;
		});
		var orderByOptions = Object.keys(this.props.colAttrs).sort().map((name)=> {
			return <option key={name}>{name}</option>;
		});
		var showOptionsForCols = ["as Text", "as Quantities", "as Categories"].map((name)=> {
			return <option key={name}>{name}</option>;
		});
		var colorByOptions = Object.keys(this.props.colAttrs).sort().map((name)=> {
			return <option key={name}>{name}</option>;
		});
		var showOptionsForColor = ["Quantitative", "Categorical"].map((name)=> {
			return <option key={name}>{name}</option>;
		});

		return(
		  <div className="panel panel-default">
			<div className="panel-heading"><h3 className="panel-title">Settings</h3></div>
			<div className="panel-body">
			  <form>
			<div className="form-group">
					<label>Show cell attribute</label>
					<select className="form-control" value={this.props.colAttr} onChange={(event)=>{this.props.onColAttrChange(event.target.value)}}>
						{colOptions}
					</select>
					<select className="form-control" value={"as " + this.props.colMode} onChange={(event)=>{this.props.onColModeChange(event.target.value.substr(3))}}>
						{showOptionsForCols}
					</select>
				</div>
				<div className="form-group">
					<label>Order by</label>
					<select className="form-control" value={this.props.orderByAttr} onChange={(event)=>{this.props.onOrderByAttrChange(event.target.value)}}>
						{orderByOptions}
					</select>
				</div>
				<div className="form-group">
					<label>Color by</label>
					<select className="form-control" value={this.props.colorByAttr} onChange={(event)=>{this.props.onColorByAttrChange(event.target.value)}}>
						{colorByOptions}
					</select>
					<select className="form-control" value={this.props.colorByMode} onChange={(event)=>{this.props.onColorByModeChange(event.target.value)}}>
						{showOptionsForColor}
					</select>
				</div>
				<div className="form-group">
					<label>Show genes</label>
					<select className="form-control" value={this.props.colorByAttr} onChange={(event)=>{this.props.onColorByAttrChange(event.target.value)}}>
						<option key="(enter genes below)">(enter genes below)</option>
						<option key="Transcription factors">Transcription factors</option>
						<option key="Neuropeptides">Neuropeptides</option>
						<option key="Dopaminergic">Dopaminergic</option>
						<option key="Save current list as...">Save current list as...</option>
					</select>
					<textarea className="form-control" rows="10" value={this.props.genesToFind} onChange={(event)=>{this.props.onFindGenesChange(event.target.value)}}></textarea>
				</div>				
			  </form>            
			</div>
		  </div>
	  	);
	}
}

SparklineSidepanel.propTypes = {
	colAttrs: 				PropTypes.object.isRequired,
	colAttr: 			PropTypes.string.isRequired,
	colMode: 			PropTypes.string.isRequired,
	orderByAttr: 		PropTypes.string.isRequired,
	colorByAttr: 		PropTypes.string.isRequired,
	colorByMode: 		PropTypes.string.isRequired,
	genesToFind: 		PropTypes.string.isRequired,

	onFindGenesChange: 		PropTypes.func.isRequired,
	onOrderByAttrChange: 	PropTypes.func.isRequired,
	onColorByAttrChange: 	PropTypes.func.isRequired,
	onColorByModeChange: 	PropTypes.func.isRequired,
	onColAttrChange: 	PropTypes.func.isRequired,
	onColModeChange: 	PropTypes.func.isRequired
}