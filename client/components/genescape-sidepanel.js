import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { AttrLegend } from './legend';
import {
	Panel, ListGroup, ListGroupItem,
	ButtonGroup, Button,
} from 'react-bootstrap';

import { SET_VIEW_PROPS, FILTER_METADATA, SET_VIEW_PROPS_AND_SORT_METADATA } from '../actions/actionTypes';

export const GenescapeSidepanel = function (props) {
	const { dispatch, dataSet } = props;
	const attrs = dataSet.rowAttrs;
	const { coordinateAttrs, asMatrix, colorAttr, colorMode,
		logscale, jitter, filterZeros } = dataSet.viewState.genescape;

	// filter out undefined attributes from selection;
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
			if (value) {
				newVals[idx] = value;
			} else {
				for (let i = idx; i < newVals.length; i++) {
					newVals[i] = newVals[i + 1];
				}
				newVals.pop();
			}
			dispatch({
				type: SET_VIEW_PROPS,
				stateName: 'genescape',
				datasetName: dataSet.dataset,
				viewState: { genescape: { coordinateAttrs: newVals } },
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
				stateName: 'genescape',
				datasetName: dataSet.dataset,
				viewState: { genescape: { [field]: value } },
			});
		};
	};

	const asMatrixHC = handleChangeFactory('asMatrix');
	const colorAttrHC = handleChangeFactory('colorAttr');
	const logscaleHC = handleChangeFactory('logscale');
	const jitterHC = handleChangeFactory('jitter');
	const filterZerosHC = handleChangeFactory('filterZeros');

	const setCoordinateFactory = (label, attr1, attr2) => {
		if (attrs[attr1] && attrs[attr2]) {
			const isSet = (coordinateAttrs[0] === attr1) && (coordinateAttrs[1] === attr2);
			const handleClick = () => {
				let newVals = coordinateAttrs.slice(0);
				newVals[0] = attr1;
				newVals[1] = attr2;
				dispatch({
					type: SET_VIEW_PROPS_AND_SORT_METADATA,
					stateName: 'genescape',
					datasetName: dataSet.dataset,
					key: attr2,
					asc: false,
					viewState: { genescape: { coordinateAttrs: newVals } },
				});
			};
			return (
				<ButtonGroup>
					<Button
						bsStyle={isSet ? 'success' : 'default'}
						onClick={handleClick}>
						{label}
				</Button>
				</ButtonGroup>
			);
		} else {
			return null;
		}
	};

	const setTSNE = setCoordinateFactory('tSNE', '_tSNE1', '_tSNE2');
	const setPCA = setCoordinateFactory('PCA', '_PC1', '_PC2');
	const setSFDP = setCoordinateFactory('SFDP', 'SFDP_X', 'SFDP_Y');


	const filterFunc = (val) => {
		return () => {
			dispatch({
				type: FILTER_METADATA,
				datasetName: dataSet.dataset,
				stateName: 'genescape',
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
				{setTSNE || setPCA || setSFDP ? (
					<ListGroupItem>
						<ButtonGroup justified>
							{setTSNE}
							{setPCA}
							{setSFDP}
						</ButtonGroup>
					</ListGroupItem>
				) : null }
				<ListGroupItem>
					{coordinateDropdowns}
					<ButtonGroup justified>
						<ButtonGroup>
							<Button
								bsStyle={logscale.x ? 'success' : 'default'}
								onClick={() => { logscaleHC({ x: !logscale.x }); } }>
								log X axis
							</Button>
						</ButtonGroup>
						<ButtonGroup>
							<Button
								bsStyle={jitter.x ? 'success' : 'default'}
								onClick={() => { jitterHC({ x: !jitter.x }); } }>
								jitter X axis
							</Button>
						</ButtonGroup>
						<ButtonGroup>
							<Button
								bsStyle={filterZeros.x ? 'success' : 'default'}
								onClick={() => { filterZerosHC({ x: !filterZeros.x }); } }>
								filter X zeros
							</Button>
						</ButtonGroup>
					</ButtonGroup>
					<ButtonGroup justified>
						<ButtonGroup>
							<Button
								bsStyle={logscale.y ? 'success' : 'default'}
								onClick={() => { logscaleHC({ y: !logscale.y }); } }>
								log Y axis
							</Button>
						</ButtonGroup>
						<ButtonGroup>
							<Button
								bsStyle={jitter.y ? 'success' : 'default'}
								onClick={() => { jitterHC({ y: !jitter.y }); } }>
								jitter Y axis
							</Button>
						</ButtonGroup>
						<ButtonGroup>
							<Button
								bsStyle={filterZeros.y ? 'success' : 'default'}
								onClick={() => { filterZerosHC({ y: !filterZeros.y }); } }>
								filter Y zeros
							</Button>
						</ButtonGroup>
					</ButtonGroup>
					<ButtonGroup>
						<Button
							bsStyle={asMatrix ? 'success' : 'default'}
							onClick={() => { asMatrixHC(!asMatrix); } }>
							Plot Matrix
						</Button>
					</ButtonGroup>
					<ButtonGroup>
						<Button
							bsStyle={asMatrix ? 'success' : 'default'}
							onClick={() => { asMatrixHC(!asMatrix); } }>
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
										stateName: 'genescape',
										datasetName: dataSet.dataset,
										viewState: { genescape: { colorMode: 'Heatmap' } },
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
										stateName: 'genescape',
										datasetName: dataSet.dataset,
										viewState: { genescape: { colorMode: 'Heatmap2' } },
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
										stateName: 'genescape',
										datasetName: dataSet.dataset,
										viewState: { genescape: { colorMode: 'Categorical' } },
									});
								} }>
								Categorical
							</Button>
						</ButtonGroup>
					</ButtonGroup>
					<AttrLegend
						mode={colorMode}
						filterFunc={filterFunc}
						attr={attrs[colorAttr]}
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