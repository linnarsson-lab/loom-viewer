import React, { PropTypes } from 'react';
import { fetchGene } from '../actions/actions.js';


export const LandscapeSidepanel = function (props) {
	const { dispatch, dataSet, genes } = props.dispatch;
	const landscapeState = props.landscapeState;

	const temp = Object.keys(dataSet.colAttrs).sort();
	temp.push("(gene)");
	const xOptions = temp.map((name) => {
		return (<li key={name}>
			<a onClick={ () => {
				dispatch({
					type: 'SET_LANDSCAPE_PROPS',
					xCoordinate: name,
				});
			} }>
				{name}
			</a>
		</li>);
	});

	const yOptions = temp.map((name) => {
		return (
			<li key={name}>
				<a onClick={ () => {
					dispatch({
						type: 'SET_LANDSCAPE_PROPS',
						yCoordinate: name,
					});
				} }>
					{name}
				</a>
			</li>
		);
	});

	const colorOptions = temp.map((name) => {
		return (
			<li key={name}>
				<a onClick={ () => {
					dispatch({
						type: 'SET_LANDSCAPE_PROPS',
						colorAttr: name,
					});
				} }>
					{name}
				</a>
			</li>
		);
	});

	const isTSNE = (landscapeState.xCoordinate === '_tSNE1') && (landscapeState.yCoordinate === '_tSNE2');
	const isPCA = (landscapeState.xCoordinate === '_PC1') && (landscapeState.yCoordinate === '_PC2');

	return (
		<div className='panel panel-default'>
			<div className='panel-heading'><h3 className='panel-title'>Settings</h3></div>
			<div className='panel-body'>
				<form>
					<div className='form-group'>
						<div className='btn-group btn-group-justified' role='group'>
							<div className='btn-group' role='group'>
								<button
									type='button'
									className={"btn" + (isTSNE ? " btn-success" : " btn-default") }
									onClick={ () => {
										dispatch({
											type: 'SET_LANDSCAPE_PROPS',
											xCoordinate: '_tSNE1',
											yCoordinate: '_tSNE2',
										});
									} }>
									tSNE
								</button>
							</div>
							<div className='btn-group' role='group'>
								<button
									type='button'
									className={"btn" + (isPCA ? " btn-success" : " btn-default") }
									onClick={ () => {
										dispatch({
											type: 'SET_LANDSCAPE_PROPS',
											xCoordinate: '_PC1',
											yCoordinate: '_PC2',
										});
									} }>
									PCA
								</button>
							</div>
						</div>
					</div>

					<div className='form-group'>
						<label>X Coordinate</label>
						<div className='btn-group btn-block'>
							<button
								type='button'
								className='btn btn-block btn-default dropdown-toggle'
								data-toggle='dropdown'
								aria-haspopup='true'
								aria-expanded='false'>
								{landscapeState.xCoordinate + "  "}<span className='caret'></span>
							</button>
							<ul className='dropdown-menu btn-block scrollable-menu'>
								{xOptions}
							</ul>
						</div>
						<div className='btn-group btn-block'>
							{landscapeState.xCoordinate === "(gene)" ?
								<input
									className='form-control'
									placeholder='Gene'
									value={landscapeState.xGene}
									onChange={() => {
										dispatch({
											type: 'SET_LANDSCAPE_PROPS',
											xGene: event.target.value,
										});
										dispatch(fetchGene(dataSet, event.target.value, genes));
									} } /> :
								<span></span>
							}
						</div>
					</div>


					<div className='form-group'>
						<label>Y Coordinate</label>
						<div className='btn-group btn-block'>
							<button
								type='button'
								className='btn btn-block btn-default dropdown-toggle'
								data-toggle='dropdown'
								aria-haspopup='true'
								aria-expanded='false'>
								{landscapeState.yCoordinate + "  "}<span className='caret'></span>
							</button>
							<ul className='dropdown-menu btn-block scrollable-menu'>
								{yOptions}
							</ul>
						</div>
						<div className='btn-group btn-block'>
							{
								landscapeState.yCoordinate === "(gene)" ?
									<input
										className='form-control'
										placeholder='Gene'
										value={landscapeState.yGene}
										onChange={(event) => {
											dispatch({
												type: 'SET_LANDSCAPE_PROPS',
												yGene: event.target.value,
											});
											dispatch(fetchGene(dataSet, event.target.value, genes));
										} } />
									:
									<span></span>
							}
						</div>
					</div>

					<div className='form-group'>
						<label>Color</label>
						<div className='btn-group btn-block'>
							<button
								type='button'
								className='btn btn-block btn-default dropdown-toggle'
								data-toggle='dropdown'
								aria-haspopup='true'
								aria-expanded='false'>
								{landscapeState.colorAttr + "  "}<span className='caret'></span>
							</button>
							<ul className='dropdown-menu btn-block scrollable-menu'>
								{colorOptions}
							</ul>
						</div>
						<div className='btn-group btn-block'>
							<button
								type='button'
								className='btn btn-block btn-default dropdown-toggle'
								data-toggle='dropdown'
								aria-haspopup='true'
								aria-expanded='false'>
								{landscapeState.colorMode + "  "}<span className='caret'></span>
							</button>
							<ul className='dropdown-menu'>
								<li key='Categorical'>
									<a onClick={ () => {
										dispatch({
											type: 'SET_LANDSCAPE_PROPS',
											colorMode: 'Categorical',
										});
									} }>
										Categorical
									</a>
								</li>
								<li key='Heatmap'>
									<a onClick={ () => {
										dispatch({
											type: 'SET_LANDSCAPE_PROPS',
											colorMode: 'Heatmap',
										});
									} }>
										Heatmap
									</a>
								</li>
							</ul>
						</div>
						<div className='btn-group btn-block'>
							{
								landscapeState.colorAttr === "(gene)" ?
									<input
										className='form-control'
										placeholder='Gene'
										value={landscapeState.colorGene}
										onChange={ () => {
											dispatch({
												type: 'SET_LANDSCAPE_PROPS',
												colorGene: event.target.value,
											});
											dispatch(fetchGene(dataSet, event.target.value, genes));
										} } />
									:
									<span></span>
							}
						</div>
					</div>
				</form>
			</div>
		</div>
	);
};

LandscapeSidepanel.propTypes = {
	landscapeState: PropTypes.object.isRequired,
	dataState: PropTypes.object.isRequired,
	genes: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};