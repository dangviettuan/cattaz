import React from 'react';
import ReactDOM from 'react-dom';
import HashRouter from 'react-router-dom/HashRouter';
import Route from 'react-router-dom/Route';
import Switch from 'react-router-dom/Switch';

import injectTapEventPlugin from 'react-tap-event-plugin';

// To be converted by postcss via webpack
import 'github-markdown-css/github-markdown.css';

import Main from './Main';
import Page from './Page';

// Needed for onTouchTap
// Check this repo:
// https://github.com/zilverline/react-tap-event-plugin
injectTapEventPlugin();

ReactDOM.render((
  <HashRouter>
    <Switch>
      <Route exact path="/" component={Main} />
      <Route path="/page/:page" component={Page} />
      <Route path="/doc/:page" render={props => <Page {...props} doc />} />
    </Switch>
  </HashRouter>
), document.getElementById('app'));
