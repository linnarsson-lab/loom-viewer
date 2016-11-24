import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { FetchGeneComponent } from './fetch-gene';
import { AttrLegend } from './legend';
import {
	Panel, ListGroup, ListGroupItem,
	Button, ButtonGroup,
} from 'react-bootstrap';

import { SET_VIEW_PROPS, FILTER_METADATA, SET_VIEW_PROPS_AND_SORT_METADATA } from '../actions/actionTypes';

export const LandscapeSidepanel = function (props) {
	const { dispatch, dataSet } = props;
	const attrs = dataSet.colAttrs, lss = dataSet.viewState.landscape;
	const { coordinateAttrs, coordinateGenes, asMatrix,
		colorAttr, colorMode, colorGene,
		logscale, jitter, filterZeros } = lss;

	// filter out undefined attributes;
	let newAttrs = [], newGenes = [];
	for (let i = 0; i < coordinateAttrs.length; i++) {
		let attr = coordinateAttrs[i];
		if (attr) {
			newAttrs.push(attr);
			newGenes.push(coordinateGenes[i]);
		}
	}

	const coordAttrFactory = (idx) => {
		return (value) => {
			let newVals = newAttrs.slice(0), newGeneVals = newGenes.slice(0);
			if (value) {
				newVals[idx] = value;
			} else {
				for (let i = idx; i < newVals.length; i++) {
					newVals[i] = newVals[i + 1];
					newGeneVals[i] = newGeneVals[i + 1];
				}
				newVals.pop();
				newGeneVals.pop();
			}
			dispatch({
				type: SET_VIEW_PROPS,
				stateName: 'landscape',
				datasetName: dataSet.dataset,
				viewState: { landscape: { coordinateAttrs: newVals, coordinateGenes: newGeneVals } },
			});
		};
	};

	const coordGeneFactory = (idx) => {
		return (value) => {
			let newVals = newGenes.slice(0);
			newVals[idx] = value;
			dispatch({
				type: SET_VIEW_PROPS,
				stateName: 'landscape',
				datasetName: dataSet.dataset,
				viewState: { landscape: { coordinateGenes: newVals } },
			});
		};
	};

	const colAttrsOptions = dataSet.colKeys.slice(0).sort();
	colAttrsOptions.push('(gene)');

	let coordinateDropdowns = [];

	for (let i = 0; i <= newAttrs.length; i++) {
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
				stateName: 'landscape',
				datasetName: dataSet.dataset,
				viewState: { landscape: { [field]: value } },
			});
		};
	};

	const asMatrixHC = handleChangeFactory('asMatrix');
	const colorAttrHC = handleChangeFactory('colorAttr');
	const colorGeneHC = handleChangeFactory('colorGene');
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
					stateName: 'landscape',
					datasetName: dataSet.dataset,
					key: attr2,
					asc: false,
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
				datasetName: dataSet.dataset,
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
							value={lss.colorGene}
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
										stateName: 'landscape',
										datasetName: dataSet.dataset,
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
										datasetName: dataSet.dataset,
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
										datasetName: dataSet.dataset,
										viewState: { landscape: { colorMode: 'Categorical' } },
									});
								} }>
								Categorical
							</Button>

						</ButtonGroup>
					</ButtonGroup>
					{colorAttr !== '(gene)' ? (
						<AttrLegend
							mode={colorMode}
							filterFunc={filterFunc}
							attr={dataSet.colAttrs[colorAttr]}
							/>
						) : (
						<AttrLegend
							mode={colorMode}
							filterFunc={filterFunc}
							attr={dataSet.fetchedGenes[colorGene]}
							/>
							) }
				</ListGroupItem>
			</ListGroup>
		</Panel >
	);
};

LandscapeSidepanel.propTypes = {
	dataSet: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};