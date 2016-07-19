import { render } from 'react-dom';

import Routes from './components/routes';
render(Routes, document.getElementById('react-root'));


// Fetch logic from opening a dataset needs to move to Router & Redux, commented
// out for later reference for now.
// <div
// 	key={key}
// 	className={'list-group-item' + (isCurrent ? ' list-group-item-info' : '') }>
// 	<a onClick={
// 		() => {
// 			const ds = state.transcriptome + '__' + state.proj + '__' + state.dataset;
// 			dispatch(fetchDataset(ds));
// 		}
// 	}>
// 		{state.dataset}
// 	</a>
// 	<span>{' ' + state.message}</span>
// </div>