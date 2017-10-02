import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
	Panel,
	ListGroup,
	ListGroupItem,
} from 'react-bootstrap';

import { FlexboxContainer } from 'components/flexbox-container.js';

import {
	AttrLegend,
	ClipDataSettings,
	CollapsibleSettings,
	DropdownMenu,
	// PrintSettings,
	boxLegend,
} from 'components/settings/settings';

import { updateAndFetchGenes } from 'actions/update-and-fetch';
import { UPDATE_VIEWSTATE } from 'actions/actionTypes';

function handleChangeFactory(that, field){
	return (value) => {
		const {
			dataset,
			dispatch,
		} = that.props;
		const action = {
			stateName: 'heatmap',
			path: dataset.path,
			viewState: {
				heatmap: {
					[field]: value,
				},
			},
		};
		dispatch(updateAndFetchGenes(dataset, action));
	};
}

const modeNames = [
	'Text',
	'Bars',
	'Box',
	'Categorical',
	'Stacked',
	'Heatmap',
	'Heatmap2',
	'Flame',
	'Icicle',
];

export class HeatmapSidepanel extends Component {
	render() {
		const {
			dispatch,
			dataset,
			className,
			style,
		} = this.props;

		const {
			col,
			row,
			path,
			viewState,
		} = dataset;

		const hms = viewState.heatmap;

		const colAttrHC = handleChangeFactory(this, 'colAttr');
		const colModeHC = handleChangeFactory(this, 'colMode');
		const rowAttrHC = handleChangeFactory(this, 'rowAttr');
		const rowModeHC = handleChangeFactory(this, 'rowMode');

		const colAttr = col.attrs[hms.colAttr];
		let colGradientSettings,
			colLegend;
		if (colAttr) {
			switch (hms.colMode) {
				case 'Heatmap':
				case 'Heatmap2':
				case 'Flame':
				case 'Icicle':
					colGradientSettings = (
						<ClipDataSettings
							dispatch={dispatch}
							dataset={dataset}
							axis={'col'}
							plotSetting={viewState.col.scatterPlots.plotSettings[0]}
							plotNr={0}
							time={200} />
					);
					break;
				default:
			}

			const colLegendFunc = (filterVal) => {
				return () => {
					dispatch(updateAndFetchGenes(dataset, {
						path,
						axis: 'col',
						filterAttrName: hms.colAttr,
						filterVal,
					}));
				};
			};
			colLegend = (
				<AttrLegend
					mode={hms.colMode}
					attr={colAttr}
					filterFunc={colLegendFunc}
					filteredAttrs={viewState.col.filter}
				/>
			);
		}

		const rowAttr = row.attrs[hms.rowAttr];
		let rowGradientSettings,
			rowLegend;
		if (rowAttr) {
			switch (hms.rowMode) {
				case 'Heatmap':
				case 'Heatmap2':
				case 'Flame':
				case 'Icicle':
					rowGradientSettings = (
						<ClipDataSettings
							dispatch={dispatch}
							dataset={dataset}
							axis={'row'}
							plotSetting={viewState.row.scatterPlots.plotSettings[0]}
							plotNr={0}
							time={200} />
					);
					break;
				default:
			}
			const rowLegendFunc = (filterVal) => {
				return () => {
					dispatch({
						type: UPDATE_VIEWSTATE,
						path,
						axis: 'row',
						filterAttrName: hms.rowAttr,
						filterVal,
					});
				};
			};
			rowLegend = (
				<AttrLegend
					mode={hms.rowMode}
					attr={rowAttr}
					filterFunc={rowLegendFunc}
					filteredAttrs={viewState.row.filter}
				/>
			);
		}
		return (
			<FlexboxContainer
				className={className}
				style={style} >
				<Panel
					className='sidepanel'
					key='heatmap-settings'
					header='Settings'
					bsStyle='default'>
					<ListGroup fill>
						<ListGroupItem>
							<CollapsibleSettings
								label={'Cell attribute or Gene to show'}>
								<div>
									<DropdownMenu
										value={hms.colAttr}
										options={col.allKeysNoUniques}
										filterOptions={col.dropdownOptions.allNoUniques}
										onChange={colAttrHC}
									/>
									<label>Show as</label>
									<DropdownMenu
										value={hms.colMode}
										options={modeNames}
										onChange={colModeHC}
									/>
								</div>
							</CollapsibleSettings>
							{colGradientSettings}
							{hms.colMode === 'Box' ?
								boxLegend :
								null
							}
							{colLegend}
						</ListGroupItem>
						<ListGroupItem>
							<CollapsibleSettings
								label={'Gene attribute to show'}>
								<div>
									<DropdownMenu
										value={hms.rowAttr}
										options={row.allKeysNoUniques}
										filterOptions={row.dropdownOptions.allNoUniques}
										onChange={rowAttrHC}
									/>
									<label>Show as</label>
									<DropdownMenu
										value={hms.rowMode}
										options={modeNames}
										onChange={rowModeHC}
									/>
								</div>
							</CollapsibleSettings>
							{rowGradientSettings}
							{rowLegend}
						</ListGroupItem>
					</ListGroup>
				</Panel>
			</FlexboxContainer>
		);
	}
}

HeatmapSidepanel.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	className: PropTypes.string,
	style: PropTypes.object,
};