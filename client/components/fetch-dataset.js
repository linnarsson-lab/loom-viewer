import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { fetchDataSet } from '../actions/actions';

// A placeholder <div> that simultaneously
// dispatches a fetchDataSet action.
export class FetchDatasetComponent extends Component {
	componentWillMount() {
		this.props.dispatch(fetchDataSet(this.props.datasets, this.props.path));
	}

	render() {
		return (
			<div className='view centered'>
				<h1>Fetching dataset: {this.props.path}</h1>
			</div>
		);
	}
}

FetchDatasetComponent.propTypes = {
	datasets: PropTypes.object.isRequired,
	path: PropTypes.string.isRequired,
	dispatch: PropTypes.func.isRequired,
};