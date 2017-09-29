import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
	ListGroupItem,
} from 'react-bootstrap';

import {
	CollapsibleSettings,
	SelectGeneComponent,
} from '../settings/settings';

import { setViewProps } from '../../actions/set-viewprops';

export class AttributeSelection extends Component {
	constructor(...args){
		super(...args);
		this.genesHC = (val) => {
			const {
				dispatch,
				dataset,
			} = this.props;
			const action = {
				stateName: 'sparkline',
				path: dataset.path,
				viewState: {
					sparkline: {
						genes: val,
					},
				},
			};
			dispatch(setViewProps(dataset, action));
		};
	}

	render() {
		const {
			dispatch,
			dataset,
			genes,
		} = this.props;

		return (
			<ListGroupItem>
				<CollapsibleSettings
					label={'Genes'}
					tooltip={'Select genes to display as sparkline or heatmap plots'}
					tooltipId={'gene-tltp'}>
					<div>
						<SelectGeneComponent
							dataset={dataset}
							dispatch={dispatch}
							onChange={this.genesHC}
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
	genes: PropTypes.arrayOf(PropTypes.string).isRequired,
};
