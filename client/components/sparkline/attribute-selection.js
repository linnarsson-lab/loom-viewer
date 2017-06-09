import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
	ListGroupItem,
} from 'react-bootstrap';

import {
	CollapsibleSettings,
	FetchGeneComponent,
} from '../settings/settings';

import { SET_VIEW_PROPS } from '../../actions/actionTypes';

export class AttributeSelection extends PureComponent {
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
					tooltip={'Select genes to display as sparkline or heatmap plots'}
					tooltipId={'gene-tltp'}>
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
	genes: PropTypes.arrayOf(PropTypes.string).isRequired,
};
