import React, { Component, PropTypes } from 'react';
import { Link } from 'react-router';
import { Navbar, Nav, NavItem } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

export class NavbarView extends Component {
	render() {
		const navbarInstance = (
			<Navbar>
				<Navbar.Header>
					<Navbar.Brand>
						<Link to='/'>Loom</Link>
					</Navbar.Brand>
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