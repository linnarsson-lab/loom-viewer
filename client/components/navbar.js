import React, { PropTypes } from 'react';
import { Navbar, Nav, NavItem } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

export const NavbarView = function (props) {
	const { transcriptome, project, dataset, viewsettings } = props.params;
	let viewLinks = null;
	if (transcriptome) {
		let projectURL = '/' + transcriptome +
			'/' + project +
			'/' + dataset +
			(viewsettings ? ('/' + viewsettings) : '');
		viewLinks = [ 'heatmap', 'sparkline', 'landscape', 'genescape'].map(
			(view) => {
				const link = '/dataset/' + view + projectURL;
				return(
					<LinkContainer to={link}>
						<NavItem eventKey={view}>
							{view}
						</NavItem>
					</LinkContainer>
				);
			}
		);
	}
	const navbarInstance = (
		<Navbar>
			<Navbar.Header>
				<LinkContainer to='/'>
					<Navbar.Brand>
						Loom - Datasets
					</Navbar.Brand>
				</LinkContainer>
				<Navbar.Toggle />
			</Navbar.Header>
			<Navbar.Collapse>
				<Nav>
					{viewLinks}
				</Nav>
			</Navbar.Collapse>
		</Navbar>
	);
	return (
		<div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', margin: '0' }}>
			{navbarInstance}
			<div style={{ display: 'flex', flex: '1 1 auto' } /* Ensure the rest of the screen is filled */}>
				{props.children}
			</div>
		</div>
	);
};

NavbarView.propTypes = {
	// Passed down by react-router-redux
	params: PropTypes.object.isRequired,
	children: PropTypes.node,
};