import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
	ListGroupItem,
} from 'react-bootstrap';

import {
	CollapsibleSettings,
	DropdownMenu,
	AttrLegend,
} from '../settings/settings';

import { fetchGene } from '../../actions/fetch-genes';
import { SET_VIEW_PROPS } from '../../actions/actionTypes';


export class LegendSettings extends PureComponent {
	componentWillMount() {
		const { dispatch, dataset } = this.props;
		const { geneToRow } = dataset.col;

		const colAttrsHC = (val) => {
			if (geneToRow[val] !== undefined &&
				!dataset.fetchedGenes[val] &&
				!dataset.fetchingGenes[val]) {
				dispatch(fetchGene(dataset, [val]));
			}
			dispatch({
				type: SET_VIEW_PROPS,
				stateName: 'sparkline',
				path: dataset.path,
				viewState: { sparkline: { colAttr: val } },
			});
		};

		const colModeHC = (val) => {
			dispatch({
				type: SET_VIEW_PROPS,
				stateName: 'sparkline',
				path: dataset.path,
				viewState: { sparkline: { colMode: val } },
			});
		};

		const colModeOptions = ['Bars', 'Categorical', 'Stacked', 'Heatmap', 'Heatmap2', 'Flame', 'Flame2'];

		this.setState({ colAttrsHC, colModeHC, colModeOptions });
	}

	shouldComponentUpdate(nextProps) {
		const ds = this.props.dataset, nds = nextProps.dataset,
			nca = nextProps.colAttr, ca = this.props.colAttr,
			vs = ds.viewState.col, nvs = nds.viewState.col;

		return nca !== ca ||
			nextProps.colMode !== this.props.colMode ||
			nvs.filter !== vs.filter ||
			nvs.lowerBound !== vs.lowerBound ||
			nvs.upperBound !== vs.upperBound ||
			nvs.log2Color !== vs.log2Color ||
			nds.col.attrs[nca] !== ds.col.attrs[ca];
	}

	render() {
		const { colAttrsHC, colModeOptions, colModeHC } = this.state;
		const { dispatch, dataset, colAttr, colMode } = this.props;
		const { col } = dataset;

		const { path } = dataset;

		const filterFunc = colAttr ? (val) => {
			return () => {
				dispatch({
					type: SET_VIEW_PROPS,
					path,
					axis: 'col',
					filterAttrName: colAttr,
					filterVal: val,
				});
			};
		} : () => { };

		const legendData = col.attrs[colAttr];
		let legend;

		if (legendData) {
			const {
				filter,
				settings,
			} = dataset.viewState.col;
			legend = (
				<AttrLegend
					mode={colMode}
					filterFunc={filterFunc}
					filteredAttrs={filter}
					settings={settings}
					attr={legendData} />
			);
		}


		return (
			<ListGroupItem>
				<CollapsibleSettings
					label={'Attribute legend'}
					tooltip={'Metadata attribute to identify the sparklines. Click a value to filter it out'}
					tooltipId={'attrlgnd-tltp'}>
					<div>
						<DropdownMenu
							value={colAttr}
							options={col.keysNoUniques}
							filterOptions={col.dropdownOptions.attrsNoUniques}
							onChange={colAttrsHC}
						/>
						<DropdownMenu
							value={colMode}
							options={colModeOptions}
							onChange={colModeHC}
						/>
					</div>
				</CollapsibleSettings>
				{legend}
			</ListGroupItem>
		);
	}
}

LegendSettings.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	colAttr: PropTypes.string,
	colMode: PropTypes.string.isRequired,
};
