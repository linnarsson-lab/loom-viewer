const prod = process.env.NODE_ENV === 'production';

export const REQUEST_PROJECTS_FETCH = prod ? 1 : 'REQUEST_PROJECTS_FETCH';
export const REQUEST_PROJECTS_FAILED = prod ? 2 : 'REQUEST_PROJECTS_FAILED';
export const RECEIVE_PROJECTS = prod ? 3 : 'RECEIVE_PROJECTS';

export const REQUEST_DATASET = prod ? 4 : 'REQUEST_DATASET';
export const REQUEST_DATASET_FETCH = prod ? 5 : 'REQUEST_DATASET_FETCH';
export const REQUEST_DATASET_CACHED = prod ? 6 : 'REQUEST_DATASET_CACHED';
export const REQUEST_DATASET_FAILED = prod ? 7 : 'REQUEST_DATASET_FAILED';
export const RECEIVE_DATASET = prod ? 8 : 'RECEIVE_DATASET';

export const SEARCH_DATASETS = prod ? 9 : 'SEARCH_DATASETS';
export const SORT_DATASETS = prod ? 10 : 'SORT_DATASETS';

export const FILTER_METADATA = prod ? 11 : 'FILTER_METADATA';
export const SORT_GENE_METADATA = prod ? 12 : 'SORT_GENE_METADATA';
export const SORT_CELL_METADATA = prod ? 13 : 'SORT_CELL_METADATA';

export const REQUEST_GENE = prod ? 14 : 'REQUEST_GENE';
export const REQUEST_GENE_FETCH = prod ? 15 : 'REQUEST_GENE_FETCH';
export const REQUEST_GENE_CACHED = prod ? 16 : 'REQUEST_GENE_CACHED';
export const REQUEST_GENE_FAILED = prod ? 17 : 'REQUEST_GENE_FAILED';
export const RECEIVE_GENE = prod ? 18 : 'RECEIVE_GENE';
export const FILTER_GENE = prod ? 19 : 'FILTER_GENE';

export const SET_VIEW_PROPS = prod ? 20 : 'SET_VIEW_PROPS';