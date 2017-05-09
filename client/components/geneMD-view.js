import React from 'react';
import PropTypes from 'prop-types';
import { MetadataComponent } from './metadata';
import { ViewInitialiser } from './view-initialiser';

function GeneMDComponent(props) {
	const { dataset, dispatch } = props;
	const { row } = dataset;
	const { attrs, keys } = row;

	return (
		<MetadataComponent
			attributes={attrs}
			attrKeys={keys}
			axis={'row'}
			mdName={'Gene'}
			stateName={'geneMD'}
			dispatch={dispatch}
			dataset={dataset}
		/>
	);
}

GeneMDComponent.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const initialState = { searchVal: '' };

const GeneMetadataViewInitialiser = function (props) {
	// Initialise geneMetadata state for this dataset
	return (
		<ViewInitialiser
			View={GeneMDComponent}
			stateName={'geneMD'}
			initialState={initialState}
			dispatch={props.dispatch}
			params={props.params}
			datasets={props.datasets} />
	);
};

GeneMetadataViewInitialiser.propTypes = {
	params: PropTypes.object.isRequired,
	datasets: PropTypes.object.isRequired,
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

export const GeneMetadataView = connect(mapStateToProps)(GeneMetadataViewInitialiser);