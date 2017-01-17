import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { AttrLegend } from './legend';
import {
	Panel, ListGroup, ListGroupItem,
	Button, ButtonToolbar, ButtonGroup,
} from 'react-bootstrap';

import { SET_VIEW_PROPS } from '../actions/actionTypes';

export const ScatterplotSidepanel = function (props) {
	const { dispatch, dataset, stateName,
		attrs, attrOptions,
		coordAttrFactory, filterFunc,
	} = props;
	const { coordinateAttrs, asMatrix,
		colorAttr, colorMode,
		logscale, jitter } = props.viewState;

	// filter out undefined attributes;
	let newAttrs = [];
	for (let i = 0; i < coordinateAttrs.length; i++) {
		let attr = coordinateAttrs[i];
		if (attr) {
			newAttrs.push(attr);
		}
	}

	const handleChangeFactory = (field) => {
		return (value) => {
			dispatch({
				type: SET_VIEW_PROPS,
				stateName,
				path: dataset.path,
				viewState: { [stateName]: { [field]: value } },
			});
		};
	};

	const asMatrixHC = handleChangeFactory('asMatrix');
	const colorAttrHC = handleChangeFactory('colorAttr');
	const logscaleHC = handleChangeFactory('logscale');
	const jitterHC = handleChangeFactory('jitter');

	const setCoordinateFactory = (label, attr1, attr2) => {
		if (attrs[attr1] && attrs[attr2]) {
			const isSet = (coordinateAttrs[0] === attr1) && (coordinateAttrs[1] === attr2);
			const handleClick = () => {
				let newVals = coordinateAttrs.slice(0);
				newVals[0] = attr1;
				newVals[1] = attr2;
				dispatch({
					type: SET_VIEW_PROPS,
					stateName,
					path: dataset.path,
					viewState: { [stateName]: { coordinateAttrs: newVals } },
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

	const coordinateQuickSettings = setTSNE || setPCA || setSFDP ? (
		<ListGroupItem>
			<ButtonGroup justified>
				{setTSNE}
				{setPCA}
				{setSFDP}
			</ButtonGroup>
		</ListGroupItem>
	) : null;


	let coordinateDropdowns = [];
	for (let i = 0; i <= newAttrs.length; i++) {
		const coordHC = coordAttrFactory(i);
		coordinateDropdowns.push(
			<div key={`${newAttrs[i]}`} >
				<DropdownMenu
					value={newAttrs[i] ? newAttrs[i] : '<select attribute>'}
					options={attrOptions}
					onChange={coordHC}
					unsorted
					/>
			</div>
		);
	}

	const coordinateButtons = (
		<ListGroupItem>
			{coordinateDropdowns}
			<ButtonGroup vertical block>
				<Button
					bsStyle={asMatrix ? 'success' : 'default'}
					onClick={() => { asMatrixHC(!asMatrix); } }>
					Plot Matrix
				</Button>
			</ButtonGroup>
			<div>X axis:</div>
			<ButtonToolbar>
				<Button
					bsStyle={logscale.x ? 'success' : 'default'}
					onClick={() => { logscaleHC({ x: !logscale.x }); } }>
					log
				</Button>
				<Button
					bsStyle={jitter.x ? 'success' : 'default'}
					onClick={() => { jitterHC({ x: !jitter.x }); } }>
					jitter
				</Button>
			</ButtonToolbar>
			<div>Y axis:</div>
			<ButtonToolbar>
				<Button
					bsStyle={logscale.y ? 'success' : 'default'}
					onClick={() => { logscaleHC({ y: !logscale.y }); } }>
					log
				</Button>
				<Button
					bsStyle={jitter.y ? 'success' : 'default'}
					onClick={() => { jitterHC({ y: !jitter.y }); } }>
					jitter
				</Button>
			</ButtonToolbar>
		</ListGroupItem>
	);

	const colorSettings = attrs[colorAttr] ? (
		<ListGroupItem>
			<ButtonGroup justified>
				<ButtonGroup>
					<Button
						bsStyle={colorMode === 'Heatmap' ? 'success' : 'default'}
						onClick={() => {
							dispatch({
								type: SET_VIEW_PROPS,
								stateName,
								path: dataset.path,
								viewState: { [stateName]: { colorMode: 'Heatmap' } },
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
								stateName,
								path: dataset.path,
								viewState: { [stateName]: { colorMode: 'Heatmap2' } },
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
								stateName,
								path: dataset.path,
								viewState: { [stateName]: { colorMode: 'Categorical' } },
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
	) : null;

	return (
		<Panel
			className='sidepanel'
			key={`${stateName}-settings`}
			header='Settings'
			bsStyle='default'>

			<ListGroup fill>
				<ListGroupItem>
					<p>In process of fixing UI. For now, to change draw order use Metadata page to sort.</p>
				</ListGroupItem>
				{coordinateQuickSettings}
				{coordinateButtons}
				<ListGroupItem>
					<label>Color</label>
					<DropdownMenu
						value={colorAttr}
						options={attrOptions}
						onChange={colorAttrHC}
						unsorted
						/>
				</ListGroupItem>
				{colorSettings}
			</ListGroup>
		</Panel >
	);
};

ScatterplotSidepanel.propTypes = {
	stateName: PropTypes.string.isRequired,
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	attrs: PropTypes.object.isRequired,
	attrOptions: PropTypes.array.isRequired,
	coordAttrFactory: PropTypes.func.isRequired,
	filterFunc: PropTypes.func.isRequired,
	viewState: PropTypes.object.isRequired,
};