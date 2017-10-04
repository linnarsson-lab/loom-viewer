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

import { UPDATE_VIEWSTATE } from '../../actions/action-types';

const colModeOptions = [
	'Bars',
	'Box',
	'Categorical',
	'Stacked',
	'Heatmap',
	'Flame',
	'Icicle',
];


export class LegendSettings extends Component {
	constructor(...args) {
		super(...args);

		const {
			dataset,
			dispatch,
		} = this.props;
		const { path } = dataset;

		this.colAttrHC = (val) => {
			dispatch({
				type: UPDATE_VIEWSTATE,
				stateName: 'sparkline',
				path,
				viewState: {
					sparkline: {
						colAttr: val,
					},
				},
			});
		};

		this.colModeHC = (val) => {
			dispatch({
				type: UPDATE_VIEWSTATE,
				stateName: 'sparkline',
				path,
				viewState: {
					sparkline: {
						colMode: val,
					},
				},
			});
		};
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
			col,
			path,
		} = dataset;

		const filterFunc = colAttr ? (val) => {
			return () => {
				dispatch({
					type: UPDATE_VIEWSTATE,
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
				type: UPDATE_VIEWSTATE,
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
									options={col.dropdownOptions.attrsNoUniques}
									onChange={this.colAttrHC}
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
							onChange={this.colModeHC}
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
