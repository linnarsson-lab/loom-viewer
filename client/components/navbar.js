import React, { PropTypes } from 'react';
import { Navbar, Nav, NavItem } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

export const NavbarView = function (props) {
	const { project, dataset, viewsettings } = props.params;
	let viewLinks = null;
	let viewSettingsURL = (viewsettings ? ('/' + viewsettings) : '');
	if (dataset) {
		viewLinks = [ 'heatmap', 'sparklines', 'cells', 'genes'].map(
			(view) => {
				const link = `/dataset/${view}/${project}/${dataset}${viewSettingsURL}`;
				return(
					<LinkContainer to={link}>
						<NavItem eventKey={view}>
							{view.charAt(0).toUpperCase() + view.slice(1)}
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
						Loom
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