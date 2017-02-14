'use strict';
import React from 'react';

const GLYPHS = {
  PONY: require('img/pony.svg'),
  UNICORN: require('img/unicorn.svg')
};

export class ClickableIconToggle extends React.Component {
  state = {
    toggled: false
  }

  onClick() {
    this.setState({toggled: !this.state.toggles});
    this.props.onClick();
  }

  render() {
    const toggleClass = this.state.toggled ? ' toggled' : '';
    return(
      <div className={'controlsToggle' + toggleClass} onClick={this.onClick}>
        {this.props.glyphs.map(glyph => <Icon key={glyph} glyph={glyph} />)}          
      </div>
    );
  }
}

export class ClickableIcon extends React.Component {
  render() {
    return <div onClick={this.props.onClick} ><Icon glyph={this.props.glyph} /> </div>;
  }
}

export default class Icon extends React.Component {
  render() {
    return <svg width="17px" height="17px" dangerouslySetInnerHTML={{__html: `<use xlink:href="#icon-${GLYPHS[this.props.glyph]}"></use>`}}/>;
  }
}
