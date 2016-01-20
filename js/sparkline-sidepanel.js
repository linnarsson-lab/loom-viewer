import React, { Component, PropTypes } from 'react';

export class SparklineSidepanel extends Component {
	render() {
		var colOptions = Object.keys(this.props.colAttrs).sort().map((name)=> {
			return <li key={name}><a onClick={(event)=>{this.props.onColAttrChange(name);}}>{name}</a></li>;
		});
		var temp = Object.keys(this.props.colAttrs).sort();
		temp.push("(unordered)");
		var orderByOptions = temp.map((name)=> {
			return <li key={name}><a onClick={(event)=>{this.props.onOrderByChange(name);}}>{name}</a></li>;
		});
		var showOptionsForCols = ["as Text", "as Quantities", "as Categories"].map((name)=> {
			return <li key={name}><a onClick={(event)=>{this.props.onColModeChange(name.substr(3));}}>{name}</a></li>;
		});
		var colorByOptions = Object.keys(this.props.colAttrs).sort().map((name)=> {
			return <li key={name}><a onClick={(event)=>{this.props.onColorByAttrChange(name);}}>{name}</a></li>;
		});
		var showOptionsForColor = ["Quantitative", "Categorical"].map((name)=> {
			return <li key={name}><a onClick={(event)=>{this.props.onColorModeChange(name);}}>{name}</a></li>;
		});

		return(
		  <div className="panel panel-default">
			<div className="panel-heading"><h3 className="panel-title">Settings</h3></div>
			<div className="panel-body">
			  <form>
				<div className="form-group">
					<label>Show cell attribute</label>
					<div className="btn-group btn-block">
						<button type="button" className="btn btn-block btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
							{this.props.colAttr + "  "}<span className="caret"></span>
						</button>
						<ul className="dropdown-menu btn-block scrollable-menu">
							{colOptions}
						</ul>
					</div>				
					<div className="btn-group btn-block">
						<button type="button" className="btn btn-block btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
							{this.props.colMode + "  "}<span className="caret"></span>
						</button>
						<ul className="dropdown-menu btn-block scrollable-menu">
							{showOptionsForCols}
						</ul>
					</div>		
				</div>

				<div className="form-group">
					<label>Order by</label>
					<div className="btn-group btn-block">
						<button type="button" className="btn btn-block btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
							{this.props.orderByAttr + "  "}<span className="caret"></span>
						</button>
						<ul className="dropdown-menu btn-block scrollable-menu">
							{orderByOptions}
						</ul>
					</div>				
				</div>

				<div className="form-group">
					<label>Color by</label>
					<div className="btn-group btn-block">
						<button type="button" className="btn btn-block btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
							{this.props.colorByAttr + "  "}<span className="caret"></span>
						</button>
						<ul className="dropdown-menu btn-block scrollable-menu">
							{colorByOptions}
						</ul>
					</div>				
					<div className="btn-group btn-block">
						<button type="button" className="btn btn-block btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
							{this.props.colorByMode + "  "}<span className="caret"></span>
						</button>
						<ul className="dropdown-menu btn-block scrollable-menu">
							{showOptionsForCols}
						</ul>
					</div>		
				</div>
				<div className="form-group">
					<label>Show genes</label>
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