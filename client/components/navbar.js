import React, { PropTypes } from 'react';
import { Navbar, Nav, NavItem } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

export const NavbarView = function (props) {
	const { project, dataset } = props.params;
	let viewLinks = null;
	if (dataset) {
		viewLinks = [ 'heatmap', 'sparklines', 'cells', 'genes', 'metadata'].map(
			(view) => {
				const link = `/dataset/${view}/${project}/${dataset}`;
				return(
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