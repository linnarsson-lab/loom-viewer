import React, { Component, PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
//import { PrintSettings } from './print-settings';
import { Panel, ListGroup, ListGroupItem } from 'react-bootstrap';

import { fetchGene } from '../actions/actions';
import { SET_VIEW_PROPS } from '../actions/actionTypes';

export class HeatmapSidepanel extends Component {

	componentWillMount() {
		const { dispatch, dataset } = this.props;

		const handleChangeFactory = (field) => {
			return (value) => {
				dispatch({
					type: SET_VIEW_PROPS,
					stateName: 'heatmap',
					path: dataset.path,
					viewState: { heatmap: { [field]: value } },
				});
			};
		};

		const colAttrHC = handleChangeFactory('colAttr');
		const colModeHC = handleChangeFactory('colMode');
		const rowAttrHC = handleChangeFactory('rowAttr');
		const rowModeHC = handleChangeFactory('rowMode');
		const modeNames = ['Text', 'Bars', 'Categorical', 'Heatmap', 'Heatmap2'];

		this.setState({
			colAttrHC, colModeHC,
			rowAttrHC, rowModeHC,
			modeNames,
		});

	}

	shouldComponentUpdate(nextProps) {
		const hms = this.props.dataset.viewState.heatmap, nextHMS = nextProps.dataset.viewState.heatmap;
		return hms.colAttr !== nextHMS.colAttr ||
			hms.colMode !== nextHMS.colMode ||
			hms.rowMode !== nextHMS.rowMode ||
			hms.rowMode !== nextHMS.rowMode;
	}

	componentWillUpdate(nextProps) {
		const { dispatch, dataset } = nextProps;
		const value = dataset.viewState.heatmap.colAttr;
		if (value && dataset.col.keys.indexOf(value) === -1 && !dataset.fetchedGenes[value]) {
			dispatch(fetchGene(dataset, value));
		}
	}

	render() {
		const { col, row } = this.props.dataset;
		const hms = this.props.dataset.viewState.heatmap;
		const {colAttrHC, colModeHC, rowAttrHC, rowModeHC, modeNames } = this.state;

		return (
			<Panel
				className='sidepanel'
				key='heatmap-settings'
				header='Settings'
				bsStyle='default'>
				<ListGroup fill>
					<ListGroupItem>
						<label>Cell attribute or Gene to show</label>
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
					</ListGroupItem>
					<ListGroupItem>
						<label>Gene attribute to show</label>
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
					</ListGroupItem>
				</ListGroup>
			</Panel>
		);
	}
}

HeatmapSidepanel.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};