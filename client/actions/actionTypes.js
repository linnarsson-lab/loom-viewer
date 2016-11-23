export const REQUEST_PROJECTS_FETCH = 1;
export const REQUEST_PROJECTS_FAILED = 2;
export const RECEIVE_PROJECTS = 3;

export const REQUEST_DATASET = 4;
export const REQUEST_DATASET_FETCH = 5;
export const REQUEST_DATASET_CACHED = 6;
export const REQUEST_DATASET_FAILED = 7;
export const RECEIVE_DATASET = 8;

export const SEARCH_DATASETS = 9;
export const SORT_DATASETS = 10;

export const FILTER_METADATA = 11;
export const SORT_GENE_METADATA = 12;
export const SORT_CELL_METADATA = 13;

export const REQUEST_GENE = 14;
export const REQUEST_GENE_FETCH = 15;
export const REQUEST_GENE_CACHED = 16;
export const REQUEST_GENE_FAILED = 17;
export const RECEIVE_GENE = 18;
export const FILTER_GENE = 19;

export const SET_VIEW_PROPS = 20;
// combine into one, to avoid needless re-renders
export const SET_VIEW_PROPS_AND_SORT_METADATA = 21;

// export const REQUEST_PROJECTS = 1;
// export const REQUEST_PROJECTS_CACHED = 3;
// export const SEARCH_METADATA = 14;
