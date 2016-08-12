import React, { PropTypes } from 'react';
import * as _ from 'lodash';
import { fetchGene } from '../actions/actions.js';

export const SparklineSidepanel = function (props) {
	const { dispatch, sparklineState, dataSet, genes } = props;

	const colOptions = Object.keys(dataSet.colAttrs).sort().map((name) => {
		return (
			<li key={name}>
				<a onClick={ () => {
					dispatch({
						type: 'SET_SPARKLINE_PROPS',
						colAttr: name,
					});
				} }>
					{name}
				</a>
			</li>
		);
	});

	let temp = Object.keys(dataSet.colAttrs).sort();
	temp.push("(original order)");
	temp.push("(gene)");
	const orderByOptions = temp.map((name) => {
		return (
			<li key={name}>
				<a onClick={ () => {
					dispatch({
						type: 'SET_SPARKLINE_PROPS',
						orderByAttr: name,
					});
				} }>
					{name}
				</a>
			</li>
		);
	});
	const optionsForCols = ["Text", "Bars", "Heatmap", "Categorical"].map((name) => {
		return (
			<li key={name}>
				<a onClick={ () => {
					dispatch({
						type: 'SET_SPARKLINE_PROPS',
						colMode: name,
					});
				} }>
					{name}
				</a>
			</li>
		);
	});
	const optionsForGenes = ["Bars", "Heatmap"].map((name) => {
		return (
			<li key={name}>
				<a onClick={ () => {
					dispatch({
						type: 'SET_SPARKLINE_PROPS',
						geneMode: name,
					});
				} }>
					{name}
				</a>
			</li>
		);
	});

	return (
		<div className='panel panel-default'>
			<div className='panel-heading'><h3 className='panel-title'>Settings</h3></div>
			<div className='panel-body'>
				<form>

					<div className='form-group'>
						<label>Order by</label>
						<div className='btn-group btn-block'>
							<button
								type='button'
								className='btn btn-block btn-default dropdown-toggle'
								data-toggle='dropdown'
								aria-haspopup='true'
								aria-expanded='false'>
								{sparklineState.orderByAttr + "  "}<span className='caret'></span>
							</button>
							<ul className='dropdown-menu btn-block scrollable-menu'>
								{orderByOptions}
							</ul>
						</div>
						<div className='btn-group btn-block'>
							{sparklineState.orderByAttr === "(gene)" ?
								<input
									className='form-control'
									placeholder='Gene'
									value={sparklineState.orderByGene}
									onChange={(event) => {
										dispatch({
											type: 'SET_SPARKLINE_PROPS',
											orderByGene: event.target.value,
										});
										dispatch(fetchGene(dataSet, event.target.value, genes));
									} } /> :
								<span></span>
							}
						</div>
					</div>

					<div className='form-group'>
						<label>Show cell attribute</label>
						<div className='btn-group btn-block'>
							<button
								type='button'
								className='btn btn-block btn-default dropdown-toggle'
								data-toggle='dropdown'
								aria-haspopup='true'
								aria-expanded='false'>
								{sparklineState.colAttr + "  "}<span className='caret'></span>
							</button>
							<ul className='dropdown-menu btn-block scrollable-menu'>
								{colOptions}
							</ul>
						</div>
						<div className='btn-group btn-block'>
							<button
								type='button'
								className='btn btn-block btn-default dropdown-toggle'
								data-toggle='dropdown'
								aria-haspopup='true'
								aria-expanded='false'>
								{sparklineState.colMode + "  "}<span className='caret'></span>
							</button>
							<ul className='dropdown-menu btn-block scrollable-menu'>
								{optionsForCols}
							</ul>
						</div>
					</div>

					<div className='form-group'>
						<label>Show genes</label>
						<textarea
							className='form-control'
							rows='5'
							value={sparklineState.genes}
							onChange={(event) => {
								dispatch({ type: 'SET_SPARKLINE_PROPS', genes: event.target.value });
								_.forEach(event.target.value.trim().split(/[ ,\r\n]+/), (gene) => {
									dispatch(fetchGene(dataSet, gene, genes));
								});
							} }>
						</textarea>
					</div>


					<div className='form-group'>
						<div className='btn-group btn-block'>
							<button type='button'
								className='btn btn-block btn-default dropdown-toggle'
								data-toggle='dropdown'
								aria-haspopup='true'
								aria-expanded='false'>
								{sparklineState.geneMode + "  "}<span className='caret'></span>
							</button>
							<ul className='dropdown-menu btn-block scrollable-menu'>
								{optionsForGenes}
							</ul>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
};

SparklineSidepanel.propTypes = {
	sparklineState: PropTypes.object.isRequired,
	dataSet: PropTypes.object.isRequired,
	genes: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};