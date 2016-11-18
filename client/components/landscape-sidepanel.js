import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { FetchGeneComponent } from './fetch-gene';
import { AttrLegend } from './legend';
import {
	Panel, ListGroup, ListGroupItem,
	Button, ButtonGroup,
} from 'react-bootstrap';

import { SET_VIEW_PROPS, FILTER_METADATA } from '../actions/actionTypes';

export const LandscapeSidepanel = function (props) {
	const { dispatch, dataSet } = props;
	const landscapeState = dataSet.landscapeState;
	const { coordinateAttrs, coordinateGenes, asMatrix, colorAttr, colorMode } = landscapeState;

	// filter out undefined attributes;
	let newAttrs = [], newGenes = [];
	for (let i = 0; i < coordinateAttrs.length; i++){
		let attr = coordinateAttrs[i];
		if (attr){
			newAttrs.push(attr);
			newGenes.push(coordinateGenes[i]);
		}
	}

	const coordAttrFactory = (idx) => {
		return (value) => {
			let newVals = newAttrs.slice(0), newGeneVals = newGenes.slice(0);
			if (value){
				newVals[idx] = value;
			} else {
				for (let i = idx; i < newVals.length; i++){
					newVals[i] = newVals[i+1];
					newGeneVals[i] = newGeneVals[i+1];
				}
				newVals.pop();
				newGeneVals.pop();
			}
			dispatch({
				type: SET_VIEW_PROPS,
				viewStateName: 'landscapeState',
				datasetName: dataSet.dataset,
				viewState: { coordinateAttrs: newVals, coordinateGenes: newGeneVals },
			});
		};
	};

	const coordGeneFactory = (idx) => {
		return (value) => {
			let newVals = newGenes.slice(0);
			newVals[idx] = value;
			dispatch({
				type: SET_VIEW_PROPS,
				viewStateName: 'landscapeState',
				datasetName: dataSet.dataset,
				viewState: { coordinateGenes: newVals },
			});
		};
	};

	const colAttrsOptions = dataSet.colKeys.slice(0).sort();
	colAttrsOptions.push('(gene)');

	let coordinateDropdowns = [];

	for (let i = 0; i <= newAttrs.length; i++){
		const coordHC = coordAttrFactory(i);
		const coordGeneHC = coordGeneFactory(i);
		coordinateDropdowns.push(
			<div key={`${i}_${newAttrs[i]}_${newGenes[i]}`} >
				<DropdownMenu
					value={newAttrs[i] ? newAttrs[i] : '<select attribute>'}
					options={colAttrsOptions}
					onChange={coordHC}
					/>
				{newAttrs[i] === '(gene)' ?
					<FetchGeneComponent
						dataSet={dataSet}
						dispatch={dispatch}
						onChange={coordGeneHC}
						value={newGenes[i] ? newGenes[i] : '<select gene>'}
						/> : null}
			</div>
		);
	}

	const handleChangeFactory = (field) => {
		return (value) => {
			dispatch({
				type: SET_VIEW_PROPS,
				viewStateName: 'landscapeState',
				datasetName: dataSet.dataset,
				viewState: { [field]: value },
			});
		};
	};

	const asMatrixHC = handleChangeFactory('asMatrix');
	const colorAttrHC = handleChangeFactory('colorAttr');
	const colorGeneHC = handleChangeFactory('colorGene');

	const isTSNE = (coordinateAttrs[0] === '_tSNE1') && (coordinateAttrs[1] === '_tSNE2');
	const isPCA = (coordinateAttrs[0] === '_PC1') && (coordinateAttrs[1] === '_PC2');

	const setTSNE = () => {
		let newVals = coordinateAttrs.slice(0);
		newVals[0] = '_tSNE1';
		newVals[1] = '_tSNE2';
		dispatch({
			type: SET_VIEW_PROPS,
			viewStateName: 'landscapeState',
			datasetName: dataSet.dataset,
			viewState: { coordinateAttrs: newVals },
		});
	};

	const setPCA = () => {
		let newVals = coordinateAttrs.slice(0);
		newVals[0] = '_PC1';
		newVals[1] = '_PC2';
		dispatch({
			type: SET_VIEW_PROPS,
			viewStateName: 'landscapeState',
			datasetName: dataSet.dataset,
			viewState: { coordinateAttrs: newVals },
		});
	};

	const filterFunc = (val) => {
		return () => {
			dispatch({
				type: FILTER_METADATA,
				dataset: dataSet.dataset,
				attr: 'colAttrs',
				key: colorAttr,
				val,
			});
		};
	};

	return (
		<Panel
			className='sidepanel'
			key='landscape-settings'
			header='Settings'
			bsStyle='default'>

			<ListGroup fill>
				<ListGroupItem>
					<p>In process of fixing UI. For now, to change draw order use Cell Metadata page to sort.</p>
				</ListGroupItem>
				<ListGroupItem>
					<ButtonGroup justified>
						<ButtonGroup>
							<Button
								bsStyle={isTSNE ? 'success' : 'default'}
								onClick={setTSNE}>
								tSNE
							</Button>
						</ButtonGroup>
						<ButtonGroup>
							<Button
								bsStyle={isPCA ? 'success' : 'default'}
								onClick={setPCA}>
								PCA
							</Button>
						</ButtonGroup>
					</ButtonGroup>
				</ListGroupItem>
				<ListGroupItem>
					{coordinateDropdowns}
					<ButtonGroup>
						<Button
							bsStyle={asMatrix ? 'success' : 'default'}
							onClick={() => {asMatrixHC(!asMatrix); } }>
							Plot Matrix
						</Button>
					</ButtonGroup>
				</ListGroupItem>
				<ListGroupItem>
					<label>Color</label>
					<DropdownMenu
						value={colorAttr}
						options={colAttrsOptions}
						onChange={colorAttrHC}
						/>
					{colorAttr === '(gene)' ?
						<FetchGeneComponent
							dataSet={dataSet}
							dispatch={dispatch}
							onChange={colorGeneHC}
							value={landscapeState.colorGene}
							/>
						: null}
				</ListGroupItem>
				<ListGroupItem>
					<ButtonGroup justified>
						<ButtonGroup>
							<Button
								bsStyle={colorMode === 'Heatmap' ? 'success' : 'default'}
								onClick={() => {
									dispatch({
										type: SET_VIEW_PROPS,
										viewStateName: 'landscapeState',
										datasetName: dataSet.dataset,
										viewState: { colorMode: 'Heatmap' },
									});
								} }>
								Heatmap
							</Button>
						</ButtonGroup>
						<ButtonGroup>
							<Button
								bsStyle={colorMode === 'Heatmap2' ? 'success' : 'default'}
								onClick={() => {
									dispatch({
										type: SET_VIEW_PROPS,
										viewStateName: 'landscapeState',
										datasetName: dataSet.dataset,
										viewState: { colorMode: 'Heatmap2' },
									});
								} }>
								Heatmap2
							</Button>
						</ButtonGroup>
						<ButtonGroup>
							<Button
								bsStyle={colorMode === 'Categorical' ? 'success' : 'default'}
								onClick={() => {
									dispatch({
										type: SET_VIEW_PROPS,
										viewStateName: 'landscapeState',
										datasetName: dataSet.dataset,
										viewState: { colorMode: 'Categorical' },
									});
								} }>
								Categorical
							</Button>

						</ButtonGroup>
					</ButtonGroup>
					{ colorAttr !== '(gene)' ? (
						<AttrLegend
							mode={colorMode}
							filterFunc={filterFunc}
							attr={dataSet.colAttrs[colorAttr]}
							/>) : null }
				</ListGroupItem>
			</ListGroup>
		</Panel >
	);
};

LandscapeSidepanel.propTypes = {
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};