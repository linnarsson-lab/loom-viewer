import React, { PropTypes } from 'react';
import { Navbar, Nav, NavItem } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

export const NavbarView = function (props) {
	const { project, filename } = props.params;
	let viewLinks = null;
	if (filename) {
		viewLinks = ['heatmap', 'sparklines', 'cells', 'cellmetadata', 'genes', 'genemetadata'].map(
			(view) => {
				const link = `/dataset/${view}/${project}/${filename}`;
				return (
					<LinkContainer to={link} key={view}>
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
			<LinkContainer to='/'>
				<Navbar.Header>
					<Navbar.Brand>
						Loom
					</Navbar.Brand>
					<Navbar.Toggle />
				</Navbar.Header>
			</LinkContainer>
			<Navbar.Collapse>
				<Nav>
					{viewLinks}
				</Nav>
			</Navbar.Collapse>
		</Navbar>
	);
	return (
		<div className='view-vertical'>
			{navbarInstance}
			<div className='view'>
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