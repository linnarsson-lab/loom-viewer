import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
	Button,
	ListGroupItem,
	Glyphicon,
} from 'react-bootstrap';

import {
	ClipDataSettings,
	CollapsibleSettings,
	DropdownMenu,
	OverlayTooltip,
} from '../settings';

import { UPDATE_VIEWSTATE } from 'actions/action-types';

import { boxLegend } from 'components/settings/boxlegend';

function handleChangeFactory(dispatch, dataset, field) {
	return (val) => {
		dispatch({
			type: UPDATE_VIEWSTATE,
			stateName: 'sparkline',
			path: dataset.path,
			viewState: { sparkline: { [field]: val } },
		});
	};
}

const geneModeOptions = [
	'Bars',
	'Box',
	'Heatmap',
	'Flame',
	'Icicle',
];
export class ColorSettings extends Component {

	constructor(...args) {
		super(...args);
		const {
			dispatch,
			dataset,
		} = this.props;



		const geneModeHC = handleChangeFactory(dispatch, dataset, 'geneMode');
		const showLabelsHC = handleChangeFactory(dispatch, dataset, 'showLabels');
		this.state = {
			geneModeHC,
			showLabelsHC,
		};
	}

	render() {
		const {
			geneModeHC,
			showLabelsHC,
		} = this.state;

		const {
			dispatch,
			dataset,
			showLabels,
			geneMode,
		} = this.props;

		const {
			plotSettings, selectedPlot,
		} = dataset.viewState.col.scatterPlots;
		const plotSetting = plotSettings[selectedPlot];

		let emphasizeNonZeroComponent;
		if (geneMode === 'Flame' || geneMode === 'Icicle') {
			const { emphasizeNonZero } = plotSetting;
			const emphasizeNZhc = () => {
				dispatch({
					type: UPDATE_VIEWSTATE,
					stateName: 'col',
					path: dataset.path,
					viewState: {
						col: {
							scatterPlots: {
								plotSettings: {
									[selectedPlot]: {
										emphasizeNonZero: !emphasizeNonZero,
									},
								},
							},
						},
					},
				});
			};
			emphasizeNonZeroComponent = (
				<div className='view'>
					<OverlayTooltip
						tooltip={'Toggle max value strip for Flame/Icicle maps'}
						tooltipId={'emphasize-nz-tltp'}>
						<Button
							bsStyle='link'
							bsSize='small'
							style={{ flex: 1 }}
							onClick={emphasizeNZhc}>
							<Glyphicon glyph={emphasizeNonZero ? 'check' : 'unchecked'} /> emphasize max column values
						</Button>
					</OverlayTooltip >
				</div>
			);
		}

		return (
			<ListGroupItem>
				<CollapsibleSettings
					label={'Mode'}
					tooltip={'Show sparklines as bar or heatmap plot'}
					tooltipId={'sparklinemode-tltp'}>
					<div>
						<div className={'view'}>
							<div style={{ flex: 5 }}>
								<DropdownMenu
									value={geneMode}
									options={geneModeOptions}
									onChange={geneModeHC}
								/>
							</div>
							<Button
								bsStyle='link'
								bsSize='small'
								style={{ flex: 1 }}
								onClick={() => { showLabelsHC(!showLabels); }} >
								<Glyphicon glyph={showLabels ? 'check' : 'unchecked'} /> labels
							</Button>
						</div>
						<ClipDataSettings
							dispatch={dispatch}
							dataset={dataset}
							axis={'col'}
							plotSetting={plotSetting}
							plotNr={selectedPlot}
							time={200} />
						{geneMode === 'Box' ? boxLegend : null}
						{emphasizeNonZeroComponent}
					</div>
				</CollapsibleSettings>
			</ListGroupItem>
		);
	}
}

ColorSettings.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	geneMode: PropTypes.string.isRequired,
	showLabels: PropTypes.bool.isRequired,
};