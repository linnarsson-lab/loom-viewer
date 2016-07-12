import React, { Component, PropTypes } from 'react';
import { Navbar, Nav, NavItem } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

export class NavbarView extends Component {
	render() {
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
						<LinkContainer to='/dataset'><NavItem eventKey={1}>
							Dataset
						</NavItem></LinkContainer>
						<LinkContainer to='/upload'><NavItem eventKey={2}>
							Upload
						</NavItem></LinkContainer>
					</Nav>
				</Navbar.Collapse>
			</Navbar>
		);
		return (
			<div>
				{navbarInstance}
				{this.props.children}
			</div>
		);
	}
}

Navbar.propTypes = {};