import React, { PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { FetchGeneComponent } from './fetch-gene';
import { AttrLegend } from './legend';
//import { PrintSettings } from './print-settings';
import {
	Panel, Button,
	ListGroup, ListGroupItem,
} from 'react-bootstrap';

import { SET_VIEW_PROPS, FILTER_METADATA } from '../actions/actionTypes';

export const SparklineSidepanel = function (props) {
	const { dispatch, dataset } = props;
	const { sparkline } = dataset.viewState;
	const { col } = dataset.data;
	// The old column attribute values that we displayed in the "legend"
	// if colAttr does not exist (for example, the default values
	// in the Loom interface is not present), pick the first column
	const attrKey = sparkline.colAttr ? sparkline.colAttr : col.keys[0];
	const legendData = col.attrs[attrKey];

	const handleChangeFactory = (field) => {
		return (val) => {
			dispatch({
				type: SET_VIEW_PROPS,
				stateName: 'sparkline',
				path: dataset.path,
				viewState: { sparkline: { [field]: val } },
			});
		};
	};

	const filterFunc = (val) => {
		return () => {
			dispatch({
				type: FILTER_METADATA,
				path: dataset.path,
				stateName: 'sparkline',
				attr: 'colAttrs',
				key: attrKey,
				val,
			});
		};
	};


	const colAttrsOptions = col.keys.filter((key) => {
		return col.attrs[key] && col.attrs[key].uniqueVal === undefined;
	}).sort();
	const colAttrsHC = handleChangeFactory('colAttr');

	const colModeOptions = ['Bars', 'Categorical', 'Heatmap', 'Heatmap2'];
	const colModeHC = handleChangeFactory('colMode');

	const genesHC = handleChangeFactory('genes');

	const geneModeOptions = ['Bars', 'Heatmap', 'Heatmap2'];
	const geneModeHC = handleChangeFactory('geneMode');

	const showLabels = handleChangeFactory('showLabels');
	const showLabelsHC = () => { showLabels(!sparkline.showLabels); };


	return (
		<Panel
			className='sidepanel'
			key='sparkline-settings'
			header='Settings'
			bsStyle='default'>
			<ListGroup fill>
				<ListGroupItem>
					<p>In process of fixing UI. For now, use Cell Metadata page to sort.</p>
				</ListGroupItem>
				<ListGroupItem>
					<label>Show cell attribute</label>
					<DropdownMenu
						value={sparkline.colAttr}
						options={colAttrsOptions}
						onChange={colAttrsHC}
						/>
					<DropdownMenu
						value={sparkline.colMode}
						options={colModeOptions}
						onChange={colModeHC}
						/>
					<AttrLegend
						mode={sparkline.colMode}
						filterFunc={filterFunc}
						attr={legendData}
						/>
				</ListGroupItem>
				<ListGroupItem>
					<label>Show genes</label>
					<FetchGeneComponent
						dataset={dataset}
						dispatch={dispatch}
						onChange={genesHC}
						value={sparkline.genes}
						multi
						clearable
						/>
					<label>Show genes as</label>
					<DropdownMenu
						value={sparkline.geneMode}
						options={geneModeOptions}
						onChange={geneModeHC}
						/>
					<Button
						bsStyle={sparkline.showLabels ? 'success' : 'default'}
						onClick={showLabelsHC}
						>
						Show labels
					</Button>
				</ListGroupItem>
			</ListGroup >
		</Panel >
	);
};

SparklineSidepanel.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};