import React, { Component, PropTypes } from 'react';
import { Jumbotron, Button, ButtonToolbar } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

export class MainView extends Component {
	render() {
		return (
			<Jumbotron>
				<h1>Loom</h1>
				<h2>Tool for browsing and visualizing single-cell data</h2>
				<ButtonToolbar>
					<LinkContainer to='/dataset'>
						<Button bsStyle='primary'>
							View Datasets
						</Button>
					</LinkContainer>
					<LinkContainer to='/upload'>
						<Button bsStyle='primary'>
							Upload New Dataset
						</Button>
					</LinkContainer>
				</ButtonToolbar>
			</Jumbotron>
		);
	}
}