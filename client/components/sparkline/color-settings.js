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
} from '../settings/settings';

import { SET_VIEW_PROPS } from '../../actions/actionTypes';

const boxLegend = (
	<table>
		<tbody>
			<tr>
				<td>
					<span style={{ color: '#EECCCC' }}>██</span> <i>max column value</i>
				</td>
			</tr>
			<tr>
				<td>
					<span style={{ color: '#EE6644' }}>██</span> <i>third quartile</i>
				</td>
			</tr>
			<tr>
				<td>
					<span style={{ color: '#000000' }}>██</span> <i>average column value</i>
				</td>
			</tr>
			<tr>
				<td>
					<span style={{ color: '#4444AA' }}>██</span> <i>first quartile</i>
				</td>
			</tr>
			<tr>
				<td>
					<span style={{ color: '#666688' }}>██</span> <i>min column value</i>
				</td>
			</tr>
		</tbody>
	</table>
);

export class ColorSettings extends Component {

	componentWillMount() {
		const { dispatch, dataset } = this.props;
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

		const geneModeOptions = ['Bars', 'Box', 'Heatmap', 'Heatmap2', 'Flame', 'Flame2'];
		const geneModeHC = handleChangeFactory('geneMode');
		const showLabelsHC = handleChangeFactory('showLabels');
		this.setState({ geneModeOptions, geneModeHC, showLabelsHC });
	}

	shouldComponentUpdate(nextProps) {
		const vs = this.props.dataset.viewState.col;
		const nvs = nextProps.dataset.viewState.col;
		return (
			this.props.showLabels !== nextProps.showLabels ||
			this.props.geneMode !== nextProps.geneMode ||
			this.props.showLabels !== nextProps.showLabels ||
			vs.settings !== nvs.settings
		);
	}

	render() {

		const {
			geneModeOptions,
			geneModeHC,
			showLabelsHC,
		} = this.state;

		const {
			dispatch,
			dataset,
			showLabels,
			geneMode,
			settings,
		} = this.props;



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
							settings={settings}
							time={200} />
						{geneMode === 'Box' ? boxLegend : null}
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
	settings: PropTypes.object.isRequired,
};