import React from 'react';
import { Menu, Image } from 'semantic-ui-react';
import logo from '../../logo.svg';
import './Navbar.css';

const navbar = (props) =>
    <Menu borderless fluid className='Navbar'>
        <Menu.Item>
            <Image size='mini' src={logo} alt='logo'  className="App-logo" />
        </Menu.Item>
        <Menu.Item header>
            Data Validation Tool
          </Menu.Item>
    </Menu>
    ;

export default navbar;
