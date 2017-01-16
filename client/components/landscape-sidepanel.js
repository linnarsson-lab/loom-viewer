import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { fetchGene } from '../actions/actions';
import { AttrLegend } from './legend';
import {
	Panel, ListGroup, ListGroupItem,
	Button, ButtonGroup,
} from 'react-bootstrap';

import { SET_VIEW_PROPS, FILTER_METADATA } from '../actions/actionTypes';

export const LandscapeSidepanel = function (props) {
	const { dispatch, dataset } = props;
	const { row, col } = dataset;
	const geneData = row.attrs.Gene.data;
	const attrs = col.attrs, lss = dataset.viewState.landscape;
	const { coordinateAttrs, asMatrix,
		colorAttr, colorMode,
		logscale, jitter, filterZeros } = lss;

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
			if (value) {
				newVals[idx] = value;
				if (geneData.indexOf(value) !== -1 && col.geneKeys.indexOf(value) === -1) {
					dispatch(fetchGene(dataset, [value]));
				}
			} else {
				for (let i = idx; i < newVals.length; i++) {
					newVals[i] = newVals[i + 1];
				}
				newVals.pop();
			}
			dispatch({
				type: SET_VIEW_PROPS,
				stateName: 'landscape',
				path: dataset.path,
				viewState: { landscape: { coordinateAttrs: newVals } },
			});
		};
	};

	const colAttrsOptions = col.keys
		.concat(geneData)
		.sort();

	let coordinateDropdowns = [];

	for (let i = 0; i <= newAttrs.length; i++) {
		const coordHC = coordAttrFactory(i);
		coordinateDropdowns.push(
			<div key={`${i}_${newAttrs[i]}`} >
				<DropdownMenu
					value={newAttrs[i] ? newAttrs[i] : '<select attribute>'}
					options={colAttrsOptions}
					onChange={coordHC}
					/>
			</div>
		);
	}

	const handleChangeFactory = (field) => {
		return (value) => {
			dispatch({
				type: SET_VIEW_PROPS,
				stateName: 'landscape',
				path: dataset.path,
				viewState: { landscape: { [field]: value } },
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
					type: SET_VIEW_PROPS,
					stateName: 'landscape',
					path: dataset.path,
					viewState: { landscape: { coordinateAttrs: newVals } },
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
				path: dataset.path,
				stateName: 'landscape',
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
				{setTSNE || setPCA || setSFDP ? (
					<ListGroupItem>
						<ButtonGroup justified>
							{setTSNE}
							{setPCA}
							{setSFDP}
						</ButtonGroup>
					</ListGroupItem>
				) : null}
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
				</ListGroupItem>
				<ListGroupItem>
					<label>Color</label>
					<DropdownMenu
						value={colorAttr}
						options={colAttrsOptions}
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
										stateName: 'landscape',
										path: dataset.path,
										viewState: { landscape: { colorMode: 'Heatmap' } },
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
										stateName: 'landscape',
										path: dataset.path,
										viewState: { landscape: { colorMode: 'Heatmap2' } },
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
										stateName: 'landscape',
										path: dataset.path,
										viewState: { landscape: { colorMode: 'Categorical' } },
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
		</Panel >
	);
};

LandscapeSidepanel.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};