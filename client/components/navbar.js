import React, { PropTypes } from 'react';
import { Navbar, Nav, NavItem } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

export const NavbarView = function (props) {
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
					<LinkContainer to='/datasets'><NavItem eventKey={1}>
						Datasets
					</NavItem></LinkContainer>
					<LinkContainer to='/upload'><NavItem eventKey={2}>
						Upload
					</NavItem></LinkContainer>
				</Nav>
			</Navbar.Collapse>
		</Navbar>
	);
	return (
		<div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', margin: '0'}}>
			{navbarInstance}
			<div style={{ display: 'flex', flex: '1 1 auto'} /* Ensure the rest of the screen is filled */}>
				{props.children}
			</div>
		</div>
	);
};

NavbarView.propTypes = {
	children: PropTypes.node,
};