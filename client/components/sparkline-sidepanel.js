import React, { Component, PropTypes } from 'react';
import { DropdownMenu } from './dropdown';
import { SortAttributeComponent } from './sort-attributes';
import { FetchGeneComponent } from './fetch-gene';
import { CollapsibleSettings } from './collapsible';
import { FilteredValues } from './filtered';

import { fetchGene } from '../actions/actions';

import {
	Panel, Button,
	ListGroup, ListGroupItem,
} from 'react-bootstrap';

import { SET_VIEW_PROPS } from '../actions/actionTypes';

class LegendSettings extends Component {
	componentWillMount() {
		const { dispatch, dataset } = this.props;
		const { keys } = dataset.col;

		const colAttrsHC = (val) => {
			if (keys.indexOf(val) === -1 && !dataset.fetchedGenes[val]) {
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

		const colModeOptions = ['Bars', 'Categorical', 'Heatmap', 'Heatmap2'];

		this.setState({ colAttrsHC, colModeHC, colModeOptions });
	}

	shouldComponentUpdate(nextProps) {
		return nextProps.colAttr !== this.props.colAttr ||
			nextProps.colMode !== this.props.colMode ||
			nextProps.dataset.col.attrs[this.props.colAttr] !== this.props.dataset.col.attrs[this.props.colAttr];
	}

	render() {
		const { colAttrsHC, colModeOptions, colModeHC } = this.state;
		const { dataset, colAttr, colMode } = this.props;
		const { col } = dataset;

		return (
			<ListGroupItem>
				<CollapsibleSettings
					label={'Attribute legend'}>
					<div>
						<DropdownMenu
							value={colAttr}
							options={col.allKeysNoUniques}
							filterOptions={col.dropdownOptions.allNoUniques}
							onChange={colAttrsHC}
						/>
						<DropdownMenu
							value={colMode}
							options={colModeOptions}
							onChange={colModeHC}
						/>
					</div>
				</CollapsibleSettings>
			</ListGroupItem>
		);
	}
}

LegendSettings.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	colAttr: PropTypes.string.isRequired,
	colMode: PropTypes.string.isRequired,
};

class AttributeSelection extends Component {
	componentWillMount() {
		const { dispatch, dataset } = this.props;
		const genesHC = (val) => {
			dispatch({
				type: SET_VIEW_PROPS,
				stateName: 'sparkline',
				path: dataset.path,
				viewState: { sparkline: { genes: val } },
			});
		};
		this.setState({ genesHC });
	}

	shouldComponentUpdate(nextProps) {
		return nextProps.genes !== this.props.genes;
	}

	render() {
		const { dispatch, dataset, genes } = this.props;

		return (
			<ListGroupItem>
				<CollapsibleSettings
					label={'Genes'}
					tooltip={'Select genes to display'}>
					<div>
						<FetchGeneComponent
							dataset={dataset}
							dispatch={dispatch}
							onChange={this.state.genesHC}
							selectedGenes={genes}
						/>
					</div>
				</CollapsibleSettings>
			</ListGroupItem>
		);
	}
}

AttributeSelection.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
	genes: PropTypes.string.isRequired,
};

class ColorSettings extends Component {

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

		const geneModeOptions = ['Bars', 'Heatmap', 'Heatmap2'];
		const geneModeHC = handleChangeFactory('geneMode');
		const showLabelsHC = handleChangeFactory('showLabels');
		this.setState({ geneModeOptions, geneModeHC, showLabelsHC });
	}

	shouldComponentUpdate(nextProps) {
		return (
			this.props.showLabels !== nextProps.showLabels ||
			this.props.geneMode !== nextProps.geneMode
		);
	}

	render() {
		const { geneModeOptions, geneModeHC, showLabelsHC } = this.state;
		const { showLabels, geneMode } = this.props;
		return (
			<ListGroupItem>
				<CollapsibleSettings
					label={'Mode'}
					tooltip={'Show sparklines as'}>
					<div>
						<div className={'view'}>
							<div style={{ flex: 5 }}>
								<DropdownMenu
									value={geneMode}
									options={geneModeOptions}
									onChange={geneModeHC}
								/>
							</div>
							<Button bsStyle={showLabels ? 'primary' : 'default'}
								style={{ flex: 1 }}
								onClick={() => { showLabelsHC(!showLabels); }} >
								labels
						</Button>
						</div>
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

export const SparklineSidepanel = function (props) {
	const { dispatch, dataset } = props;
	const { sparkline } = dataset.viewState;

	return (
		<Panel
			className='sidepanel'
			key='sparkline-settings'
			header='Settings'
			bsStyle='default'>
			<ListGroup fill>
				<AttributeSelection
					dataset={dataset}
					dispatch={dispatch}
					genes={sparkline.genes} />
				<ColorSettings
					dataset={dataset}
					dispatch={dispatch}
					geneMode={sparkline.geneMode}
					showLabels={sparkline.showLabels} />
				<LegendSettings
					dataset={dataset}
					dispatch={dispatch}
					colAttr={sparkline.colAttr}
					colMode={sparkline.colMode} />
				<ListGroupItem>
					<FilteredValues
						dispatch={dispatch}
						dataset={dataset}
						axis={'col'}
						filtered={dataset.viewState.col.filter} />
				</ListGroupItem>
				<ListGroupItem>
					<CollapsibleSettings
						label={'Order'}
						tooltip={'Keys to sort datapoints by (select same value twice to toggle ascending/descending)'}
						mountClosed>
						<div>
							<SortAttributeComponent
								attributes={dataset.col.attrs}
								attrKeys={dataset.col.allKeysNoUniques}
								axis={'col'}
								stateName={'sparkline'}
								dataset={dataset}
								dispatch={dispatch} />
						</div>
					</CollapsibleSettings>
				</ListGroupItem>
			</ListGroup >
		</Panel >
	);
};

SparklineSidepanel.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};