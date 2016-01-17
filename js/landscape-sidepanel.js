import React, { Component, PropTypes } from 'react';



export class LandscapeSidepanel extends Component {
	render() {
		var xOptions = Object.keys(this.props.colAttrs).sort().map((name)=> {
			return <li key={name}><a onClick={(event)=>{this.props.onXCoordinateChange(name);}}>{name}</a></li>;
		});
		//xOptions.push(<li key="(gene)"><a>(gene)</a></li>);		
		
		var yOptions = Object.keys(this.props.colAttrs).sort().map((name)=> {
			return <li key={name}><a onClick={(event)=>{this.props.onYCoordinateChange(name);}}>{name}</a></li>;
		});
		//yOptions.push(<li key="(gene)"><a>(gene)</a></li>);

		var colorOptions = Object.keys(this.props.colAttrs).sort().map((name)=> {
			return <li key={name}><a onClick={(event)=>{this.props.onColorAttrChange(name);}}>{name}</a></li>;
		});
		colorOptions.push(<li key="(gene)"><a onClick={(event)=>{this.props.onColorAttrChange("(gene)");}}>(gene)</a></li>);

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
						<div className="btn-group btn-block">
							<button type="button" className="btn btn-block btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
								{this.props.xCoordinate + "  "}<span className="caret"></span>
							</button>
							<ul className="dropdown-menu btn-block scrollable-menu">
								{xOptions}
							</ul>
						</div>				
					</div>


					<div className="form-group">
						<label>Y Coordinate</label>
						<div className="btn-group btn-block">
							<button type="button" className="btn btn-block btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
								{this.props.yCoordinate + "  "}<span className="caret"></span>
							</button>
							<ul className="dropdown-menu btn-block scrollable-menu">
								{yOptions}
							</ul>
						</div>				
					</div>

					<div className="form-group">
						<label>Color</label>
						<div className="btn-group btn-block">
							<button type="button" className="btn btn-block btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
								{this.props.colorAttr + "  "}<span className="caret"></span>
							</button>
							<ul className="dropdown-menu btn-block scrollable-menu">
								{colorOptions}
							</ul>
						</div>
						<div className="btn-group btn-block">
							<button type="button" className="btn btn-block btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
								{this.props.colorMode + "  "}<span className="caret"></span>
							</button>
							<ul className="dropdown-menu">
								<li key="Categorical"><a onClick={(event)=>{this.props.onColorModeChange("Categorical");}}>Categorical</a></li>
								<li key="Quantitative"><a onClick={(event)=>{this.props.onColorModeChange("Quantitative");}}>Quantitative</a></li>
							</ul>
						</div>
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