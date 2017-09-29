import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { ScatterplotComponent } from 'components/scatterplot/scatterplot-view';

import { ViewInitialiser } from 'components/view-initialiser';

class GenescapeComponent extends PureComponent {
	render() {
		return (
			<ScatterplotComponent
				axis='row'
				dataset={this.props.dataset}
				dispatch={this.props.dispatch} />
		);
	}
}

GenescapeComponent.propTypes = {
	// Passed down by ViewInitialiser
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

export class GenescapeViewInitialiser extends PureComponent {
	render() {
		return (
			<ViewInitialiser
				View={GenescapeComponent}
				dispatch={this.props.dispatch}
				params={this.props.params}
				datasets={this.props.datasets} />
		);
	}
}

GenescapeViewInitialiser.propTypes = {
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

export const GenescapeView = connect(mapStateToProps)(GenescapeViewInitialiser);