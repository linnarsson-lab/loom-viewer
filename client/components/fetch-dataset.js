import React, { Component, PropTypes } from 'react';
import { fetchDataSet } from '../actions/actions';

// A placeholder <div> that simultaneously
// dispatches a fetchDataSet action.
export class FetchDatasetComponent extends Component {
	componentDidMount() {
		const { dispatch, dataSets, dataset, project } = this.props;
		dispatch(fetchDataSet({ dataSets, project, dataset}));
	}

	render() {
		const { dataset } = this.props;
		return <div className='view' >Fetching dataset: {dataset}</div>;
	}
}

FetchDatasetComponent.propTypes = {
	dataSets: PropTypes.object.isRequired,
	dataset: PropTypes.string.isRequired,
	project: PropTypes.string.isRequired,
	dispatch: PropTypes.func.isRequired,
};