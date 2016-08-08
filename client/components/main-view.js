import React from 'react';
import { Grid, Row, Col, Button, ButtonToolbar } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

export const MainView = function () {
	return (
		<Grid>
			<Row>
				<Col xs={12} md={8}>
					<h1>Loom</h1>
					<h2>Tool for browsing and visualizing single-cell data</h2>
					<ButtonToolbar>
						<LinkContainer to='/datasets'>
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
				</Col>
			</Row>
		</Grid>
	);
};