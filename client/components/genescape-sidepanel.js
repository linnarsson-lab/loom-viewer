import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { AttrLegend } from './legend';
import {
	Panel, ListGroup, ListGroupItem,
	ButtonGroup, Button,
} from 'react-bootstrap';

import { SET_VIEW_PROPS, FILTER_METADATA } from '../actions/actionTypes';

export const GenescapeSidepanel = function (props) {
	const { dispatch, dataSet } = props;
	const { genescapeState } = dataSet;
	const { coordinateAttrs, coordinateGenes, asMatrix, colorAttr, colorMode} = genescapeState;

	// filter out undefined attributes;
	let newAttrs = [];
	for (let i = 0; i < coordinateAttrs.length; i++) {
		let attr = coordinateAttrs[i];
		if (attr) {
			newAttrs.push(attr);
		}
	}

	const coordAttrFactory = (idx) => {
		return (value) => {
			let newVals = newAttrs.slice(0);
			newVals[idx] = value;
			dispatch({
				type: SET_VIEW_PROPS,
				viewStateName: 'genescapeState',
				datasetName: dataSet.dataset,
				viewState: { coordinateAttrs: newVals },
			});
		};
	};

	const rowAttrOptions = dataSet.rowKeys.sort();

	let coordinateDropdowns = [];

	for (let i = 0; i <= newAttrs.length; i++) {
		const coordHC = coordAttrFactory(i);
		coordinateDropdowns.push(
			<DropdownMenu
				key={i}
				value={newAttrs[i] ? newAttrs[i] : '<select attribute>'}
				options={rowAttrOptions}
				onChange={coordHC}
				/>
		);
	}

	const handleChangeFactory = (field) => {
		return (value) => {
			dispatch({
				type: SET_VIEW_PROPS,
				viewStateName: 'genescapeState',
				datasetName: dataSet.dataset,
				viewState: { [field]: value },
			});
		};
	};

	const asMatrixHC = handleChangeFactory('asMatrix');
	const colorAttrHC = handleChangeFactory('colorAttr');

	const isTSNE = (coordinateAttrs[0] === '_tSNE1') && (coordinateAttrs[1] === '_tSNE2');
	const isPCA = (coordinateAttrs[0] === '_PC1') && (coordinateAttrs[1] === '_PC2');

	const setTSNE = () => {
		let newVals = coordinateAttrs.slice(0);
		newVals[0] = '_tSNE1';
		newVals[1] = '_tSNE2';
		dispatch({
			type: SET_VIEW_PROPS,
			viewStateName: 'genescapeState',
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
			viewStateName: 'genescapeState',
			datasetName: dataSet.dataset,
			viewState: { coordinateAttrs: newVals },
		});
	};

	const filterFunc = (val) => {
		return () => {
			dispatch({
				type: FILTER_METADATA,
				dataset: dataSet.dataset,
				attr: 'rowAttrs',
				key: colorAttr,
				val,
			});
		};
	};

	return (
		<Panel
			className='sidepanel'
			key='genescape-settings'
			header='Settings'
			bsStyle='default'>
			<ListGroup fill>
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
						options={rowAttrOptions}
						onChange={colorAttrHC}
						/>
				</ListGroupItem>
				<ListGroupItem>
					<ButtonGroup justified>
						<ButtonGroup>
							<Button
								bsStyle={colorMode === 'Heatmap' ? 'success' : 'default'}
								onClick={() => {
									dispatch({
										type: SET_VIEW_PROPS,
										viewStateName: 'genescapeState',
										datasetName: dataSet.dataset,
										viewState: { colorMode: 'Heatmap' },
									});
								} }>
								Heatmap
							</Button>
						</ButtonGroup>						<ButtonGroup>
							<Button
								bsStyle={colorMode === 'Heatmap2' ? 'success' : 'default'}
								onClick={() => {
									dispatch({
										type: SET_VIEW_PROPS,
										viewStateName: 'genescapeState',
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
										viewStateName: 'genescapeState',
										datasetName: dataSet.dataset,
										viewState: { colorMode: 'Categorical' },
									});
								} }>
								Categorical
							</Button>
						</ButtonGroup>
					</ButtonGroup>
					<AttrLegend
						mode={colorMode}
						filterFunc={filterFunc}
						attr={dataSet.rowAttrs[colorAttr]}
						/>
				</ListGroupItem>
			</ListGroup>
		</Panel>
	);
};

GenescapeSidepanel.propTypes = {
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};