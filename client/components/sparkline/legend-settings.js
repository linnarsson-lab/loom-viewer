import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
	ListGroupItem,
	Button,
	Glyphicon,
} from 'react-bootstrap';

import {
	CollapsibleSettings,
	DropdownMenu,
	AttrLegend,
} from '../settings/settings';

import { SET_VIEW_PROPS } from '../../actions/actionTypes';

import { createComparator } from '../../js/state-comparator';

const comparePlotSetting = createComparator({
	logScale: 'boolean',
	clip: 'boolean',
	lowerBound: 'number',
	upperBound: 'number',
});

// we only look at the first scatterPlot
const comparePlotSettings = (a, b) => {
	return comparePlotSetting(a[0], b[0]);
};

const compareProps = createComparator({
	colAttr: 'string',
	colMode: 'string',
	groupBy: 'boolean',
	legendData: 'object',
	// clip and log settings for heatmap
	// also affect the legend
	dataset: {
		viewState: {
			col: {
				filter: 'array',
				scatterPlots: {
					plotSettings: comparePlotSettings,
				},
			},
		},
	},
});

export class LegendSettings extends Component {
	componentWillMount() {
		const { dispatch, dataset } = this.props;

		const colAttrHC = (val) => {
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

		const colModeOptions = ['Bars', 'Box', 'Categorical', 'Stacked', 'Heatmap', 'Heatmap2', 'Flame', 'Icicle'];

		this.setState({
			colAttrHC,
			colModeHC,
			colModeOptions,
		});
	}

	shouldComponentUpdate(nextProps) {
		return !compareProps(this.props, nextProps);
	}

	render() {
		const {
			dispatch,
			dataset,
			colAttr,
			colMode,
			groupBy,
			legendData,
		} = this.props;

		const {
			colAttrHC,
			colModeOptions,
			colModeHC,
		} = this.state;

		const {
			col,
			path,
		} = dataset;

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

		const groupByHC = () => {
			dispatch({
				type: SET_VIEW_PROPS,
				stateName: 'sparkline',
				path: dataset.path,
				viewState: {
					sparkline: {
						groupBy: !groupBy,
					},
				},
			});
		};

		return (
			<ListGroupItem>
				<CollapsibleSettings
					label={'Attribute legend'}
					tooltip={'Metadata attribute to identify the sparklines. Click a value to filter it out'}
					tooltipId={'attrlgnd-tltp'}>
					<div>
						<div className={'view'}>
							<div style={{ flex: 5 }}>
								<DropdownMenu
									value={colAttr}
									options={col.keysNoUniques}
									filterOptions={col.dropdownOptions.attrsNoUniques}
									onChange={colAttrHC}
								/>
							</div>
							<Button
								bsStyle='link'
								bsSize='small'
								style={{ flex: 1 }}
								onClick={groupByHC} >
								<Glyphicon glyph={groupBy ? 'check' : 'unchecked'} /> group
							</Button>
						</div>
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
	groupBy: PropTypes.bool,
	legendData: PropTypes.object,
};
