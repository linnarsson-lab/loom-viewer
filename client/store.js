import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';

// import the root reducer
import loomAppReducer from './reducers/reducers';

export const store = createStore(
	loomAppReducer,
	compose(
		applyMiddleware(thunk),
		window.devToolsExtension ? window.devToolsExtension() : (f) => { return f; }
	)
);