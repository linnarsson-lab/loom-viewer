import React, { Component, PropTypes } from 'react';

export class GenescapeSidepanel extends Component {
	render() {
		var dispatch = this.props.dispatch;
		var fi = this.props.fileInfo;
		var gs = this.props.genescapeState;

		var temp = Object.keys(fi.rowAttrs).sort();
		var xOptions = temp.map((name)=> {
			return <li key={name}>
				<a onClick={(event)=>dispatch({ 
						type: 'SET_GENESCAPE_PROPS', 
						xCoordinate: name
					})}>
					{name}
				</a>
			</li>;
		});
		
		var temp = Object.keys(fi.rowAttrs).sort();
		var yOptions = temp.map((name)=> {
			return <li key={name}><a onClick={(event)=>dispatch({ 
						type: 'SET_GENESCAPE_PROPS', 
						yCoordinate: name
					})}>{name}</a></li>;
		});

		var temp = Object.keys(fi.rowAttrs).sort();
		var colorOptions = temp.map((name)=> {
			return <li key={name}><a onClick={(event)=>dispatch({ 
						type: 'SET_GENESCAPE_PROPS', 
						colorAttr: name
					})}>{name}</a></li>;
		});

		return(
		  <div className="panel panel-default">
			<div className="panel-heading"><h3 className="panel-title">Settings</h3></div>
			<div className="panel-body">
				<form>

					<div className="form-group">
						<label>X Coordinate</label>
						<div className="btn-group btn-block">
							<button type="button" className="btn btn-block btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
								{gs.xCoordinate + "  "}<span className="caret"></span>
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
								{gs.yCoordinate + "  "}<span className="caret"></span>
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
								{gs.colorAttr + "  "}<span className="caret"></span>
							</button>
							<ul className="dropdown-menu btn-block scrollable-menu">
								{colorOptions}
							</ul>
						</div>
						<div className="btn-group btn-block">
							<button type="button" className="btn btn-block btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
								{gs.colorMode + "  "}<span className="caret"></span>
							</button>
							<ul className="dropdown-menu">
								<li key="Categorical"><a onClick={(event)=>dispatch({ 
									type: 'SET_GENESCAPE_PROPS', 
									colorMode: 'Categorical'
								})}>Categorical</a></li>
								<li key="Heatmap"><a onClick={(event)=>dispatch({ 
									type: 'SET_GENESCAPE_PROPS', 
									colorMode: 'Heatmap'
								})}>Quantitative</a></li>
							</ul>
						</div>
					</div>
				</form>            
			</div>
		</div>
	  	);
	}

}

GenescapeSidepanel.propTypes = {
	genescapeState: 	PropTypes.object.isRequired,
	fileInfo: 			PropTypes.object.isRequired,
	dispatch: 			PropTypes.func.isRequired
}