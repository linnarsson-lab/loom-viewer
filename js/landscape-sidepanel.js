import React, { Component, PropTypes } from 'react';



export class LandscapeSidepanel extends Component {
	makeOptions() {
		var options = Object.keys(this.props.colAttrs).sort().map((name)=> {
			return <option key={name}>{name}</option>;
		});
		options.push(<option key="(gene)">(gene)</option>);
		return options;
	}
	render() {
//		console.log(this.props);
		var xOptions = this.makeOptions();
		var yOptions = this.makeOptions();
		var colorOptions = this.makeOptions();
		var showOptionsForColor = ["Quantitative", "Categorical"].map((name)=> {
			return <option key={name}>{name}</option>;
		});

		var isTSNE = (this.props.xCoordinate == '_tSNE1') && (this.props.yCoordinate == '_tSNE2');
		var isPCA = (this.props.xCoordinate == '_PC1') && (this.props.yCoordinate == '_PC2');

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
						    	onClick={(event=>{this.props.onXCoordinateChange('_tSNE1'); this.props.onYCoordinateChange('_tSNE2');})}
						    >tSNE</button>
						  </div>
						  <div className="btn-group" role="group">
						    <button 
						    	type="button" 
						    	className={"btn" + (isPCA ? " btn-success" : " btn-default")}
						    	onClick={(event=>{this.props.onXCoordinateChange('_PC1'); this.props.onYCoordinateChange('_PC2');})}						    	
						    >PCA</button>
						  </div>
						</div>
					</div>
					<div className="form-group">
						<label>X Coordinate</label>
						<select className="form-control" value={this.props.xCoordinate} onChange={(event)=>{this.props.onXCoordinateChange(event.target.value)}}>
							{xOptions}
						</select>
						{this.props.xCoordinate == "(gene)" ? 
							<input className="form-control" placeholder="Gene" value={this.props.xGene} onChange={(event)=>{this.props.onXGeneChange(event.target.value)}}/> : 
							<span></span>
						}
					</div>
					<div className="form-group">
						<label>Y Coordinate</label>
						<select className="form-control" value={this.props.yCoordinate} onChange={(event)=>{this.props.onYCoordinateChange(event.target.value)}}>
							{yOptions}
						</select>
						{this.props.yCoordinate == "(gene)" ? 
							<input className="form-control" placeholder="Gene" value={this.props.yGene} onChange={(event)=>{this.props.onYGeneChange(event.target.value)}}/> : 
							<span></span>
						}
					</div>
					<div className="form-group">
						<label>Color</label>
						<select className="form-control" value={this.props.colorAttr} onChange={(event)=>{this.props.onColorAttrChange(event.target.value)}}>
							{colorOptions}
						</select>
						<select className="form-control" value={this.props.colorMode} onChange={(event)=>{this.props.onColorModeChange(event.target.value)}}>
							{showOptionsForColor}
						</select>
						{this.props.colorAttr == "(gene)" ? 
							<input className="form-control" placeholder="Gene" value={this.props.colorGene} onChange={(event)=>{this.props.onColorGeneChange(event.target.value)}}/> : 
							<span></span>
						}
					</div>
				</form>            
			</div>
		</div>
	  	);
	}

}

LandscapeSidepanel.propTypes = {
	colAttrs: 				PropTypes.object.isRequired,
	xCoordinate: 			PropTypes.string.isRequired,
	xGene: 					PropTypes.string.isRequired,
	yCoordinate: 			PropTypes.string.isRequired,
	yGene: 					PropTypes.string.isRequired,
	colorAttr: 				PropTypes.string.isRequired,
	colorMode: 				PropTypes.string.isRequired,
	colorGene: 				PropTypes.string.isRequired,
	onXCoordinateChange: 	PropTypes.func.isRequired,
	onYCoordinateChange: 	PropTypes.func.isRequired,
	onColorAttrChange: 		PropTypes.func.isRequired,
	onColorModeChange: 		PropTypes.func.isRequired,
	onColorGeneChange: 		PropTypes.func.isRequired,
	onXGeneChange: 			PropTypes.func.isRequired,
	onYGeneChange: 			PropTypes.func.isRequired
}