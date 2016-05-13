import React, { Component, PropTypes } from 'react';

export class GenescapeSidepanel extends Component {
	render() {
		const dispatch = this.props.dispatch;
		const gs = this.props.genescapeState;
		const ds = this.props.dataState;

		const rowAttrKeys = Object.keys(ds.currentDataset.rowAttrs).sort();

		const newOptions = (sortedKeys, typeLabel, nameLabel) => {
			return (
				sortedKeys.map((name) => {

					let dispatchParam = { type: typeLabel };
					dispatchParam[nameLabel] = name;

					return (
						<ul className='dropdown-menu btn-block scrollable-menu'>
							<li key={name}>
								<a onClick={
									() => { dispatch(dispatchParam); }
								}>
									{name}
								</a>
							</li>
						</ul>
					);
				})
			);
		};


		const xOptions = newOptions(rowAttrKeys, 'SET_GENESCAPE_PROPS', 'xCoordinate');
		const yOptions = newOptions(rowAttrKeys, 'SET_GENESCAPE_PROPS', 'yCoordinate');
		const colorOptions = newOptions(rowAttrKeys, 'SET_GENESCAPE_PROPS', 'colorAttr');

		const colorModes = (
			<ul className='dropdown-menu'>
				<li key='Categorical'>
					<a onClick={
						() => { dispatch({ type: 'SET_GENESCAPE_PROPS', colorMode: 'Categorical' }); }
					}>
						Categorical
					</a>
				</li>
				<li key='Heatmap'>
					<a onClick={
						() => { dispatch({ type: 'SET_GENESCAPE_PROPS', colorMode: 'Heatmap' }); }
					}>
						Quantitative
					</a>
				</li>
			</ul>
		);

		const newButtonmenu = (labelString, buttonName, options) => {
			return (
				<div className='form-group'>
					{ labelString ? <label>{labelString}</label> : null }
					<div className='btn-group btn-block'>
						<button
							type='button'
							className='btn btn-block btn-default dropdown-toggle'
							data-toggle='dropdown'
							aria-haspopup='true'
							aria-expanded='false' >
							{ buttonName + '  '}
							<span className='caret' />
						</button>
						{ options }
					</div>
				</div>
			);
		};

		const xButton = newButtonmenu('X Coordinate', gs.xCoordinate, xOptions);
		const yButton = newButtonmenu('Y Coordinate', gs.yCoordinate, yOptions);
		const colorButton = newButtonmenu('Color', gs.colorAttr, colorOptions);
		const colorModeButton = newButtonmenu(null, gs.colorMode, colorModes);

		return (
			<div className='panel panel-default'>
				<div className='panel-heading'><h3 className='panel-title'>Settings</h3></div>
				<div className='panel-body'>
					<form>
						{xButton}
						{yButton}
						{colorButton}
						{colorModeButton}
					</form>
				</div>
			</div>
		);
	}
}

GenescapeSidepanel.propTypes = {
	genescapeState: PropTypes.object.isRequired,
	dataState: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};