import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { MetadataComponent } from './metadata';

import { ViewInitialiser } from '../view-initialiser';

class CellMDComponent extends Component {
	render() {
		const {
			dataset,
			dispatch,
		} = this.props;
		const {
			attrs,
			keys,
		} = dataset.col;

		return (
			<MetadataComponent
				attributes={attrs}
				attrKeys={keys}
				axis={'col'}
				mdName={'Cell'}
				stateName={'cellMD'}
				dispatch={dispatch}
				dataset={dataset}
			/>
		);
	}
}

CellMDComponent.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

class CellMetadataViewInitialiser extends Component {

	render() {
		// Initialise cellMetadataState for this dataset
		return (
			<ViewInitialiser
				View={CellMDComponent}
				dispatch={this.props.dispatch}
				params={this.props.params}
				datasets={this.props.datasets} />
		);
	}
}

CellMetadataViewInitialiser.propTypes = {
	params: PropTypes.object.isRequired,
	datasets: PropTypes.object,
	dispatch: PropTypes.func.isRequired,
};

import { connect } from 'react-redux';

// react-router-redux passes URL parameters
// through ownProps.params. See also:
// https://github.com/reactjs/react-router-redux#how-do-i-access-router-state-in-a-container-component
const mapStateToProps = (state, ownProps) => {
	return {
		params: ownProps.params,
		datasets: state.datasets.list,
	};
};

export const CellMetadataView = connect(mapStateToProps)(CellMetadataViewInitialiser);