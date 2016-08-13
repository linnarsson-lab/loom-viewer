
# `.loom` file format

The `.loom` file format is designed to efficiently hold large omics datasets. Typically, such data takes the form of a large
matrix of numbers, along with metadata for the rows and columns. For example, single-cell RNA-seq data consists
expression measurements for all genes (rows) in a large number of cells (columns), along with metadata for genes (e.g. `Chromosome`,
`Strand`, `Location`, `Name`), and for cells (e.g. `Species`, `Sex`, `Strain`, `GFP positive`). 

We designed `.loom` files to represent such datasets in a way that treats rows and columns the same. You may want to cluster
both genes and cells, you may want to perform PCA on both of them, and filter based on quality controls. SQL databases
and other data storage solutions almost always treat data as a *table*, not a matrix, and makes it very hard to add arbitrary
metadata to rows and columns. In contrast, `.loom` makes this bvery easy.

Furthermore, current and future datasets can have tens of thousands of rows (genes) and hundreds of thousands of columns (cells). We 
designed `.loom` for efficient access to arbitrary rows and columns. 

Finally, the annotated matrix format lends itself to very natural representation of common analysis tasks. For example, the result
of a clustering algorihtm can be stored simply as another attribute that gives the cluser ID for each cell. Dimensionality 
reduction such as PCA or t-SNE, similarly, can be stored as two attributes giving the projection coordinates of each cell.

## HDF5 concepts

The `.loom` format is based on [HDF5](https://en.wikipedia.org/wiki/Hierarchical_Data_Format), a standard for storing large 
numerical datasets. Quoting from h5py.org:

> An HDF5 file is a container for two kinds of objects: datasets, which are array-like collections of data, 
> and groups, which are folder-like containers that hold datasets and other groups. The most fundamental 
> thing to remember when using h5py is: *Groups work like dictionaries, and datasets work like NumPy arrays*.

A valid `.loom` file is simply an HDF5 file that contains specific *groups* representing the main matrix
as well as row and column attributes. Because of this, `.loom` files can be created and read by any language
that supports HDF5, including [Python](http://h5py.org),
[R](http://bioconductor.org/packages/release/bioc/html/rhdf5.html), 
[MATLAB](http://se.mathworks.com/help/matlab/low-level-functions.html), [Mathematica](https://reference.wolfram.com/language/ref/format/HDF5.html), 
[C](https://www.hdfgroup.org/HDF5/doc/index.html), [C++](https://www.hdfgroup.org/HDF5/doc/cpplus_RM/), 
[Java](https://www.hdfgroup.org/products/java/), and [Ruby](https://rubygems.org/gems/hdf5/versions/0.3.5).

## Example

Here's an example of the structure of a valid `.loom` file:

|Group|Type|Description|
+-----+----+-----------+
|/matrix|float32[N,M]|Matrix of N rows and M columns|
|/row_attrs/| (subgroup) | Subgroup of all row attributes|
|/row_attrs/Name|string[N]| Row attribute "Name" of type string|
|/col_attrs/|(subgroup)|Subgroup of all column attributes|
|/col_attrs/CellID|float32[M] | Column attribute "CellID" of type float64 |

## Specification

A valid `.loom` file conforms to the following:

* There MUST be a single dataset at `/matrix` of type float32[N,M]
* There can OPTINALLY be one or more [HDF5 attributes](https://www.hdfgroup.org/HDF5/Tutor/crtatt.html) on the `/matrix` dataset. 
  If there are, they MUST be of type `string` and should be interpreted as attribute of the whole `.loom` file. 
  The following HDF5 attributes are standard: 
  * `title`, a short title for the dataset
  * `description`, a longer description of the dataset
  * `url`, a link to a web page for the dataset
  * `doi`, a DOI for the paper where the dataset was published
* There MUST be a group `/row_attrs``
* There MAY be one or more datasets at `/row_attrs/{name}` of type float64[N] or string[N]
* There MUST be a group `/col_attrs``
* There MAY be one or more datasets at `/col_attrs/{name}` of type float64[M] or string[M]
* There MAY be a group at `/tiles`, and it should be ignored

The datasets under `/row_attrs` should be semantically interpreted as row attributes, with one value
per row of the main matrix, and in the same order. Therefore, all datasets under this group must 
be one-dimensional arrays with exactly N elements, where N is the number of rows in the main matrix.

The datasets under `/col_attrs` should be semantically interpreted as column attributes, with one value
per column of the main matrix, and in the same order. Therefore, all datasets under this group must 
be one-dimensional arrays with exactly M elements, where M is the number of columns in the main matrix.

As noted above, only three datatypes are allowed: `float32` for the main matrix and either `float64` or
`string` for attributes. Note that there is no integer attribute type. However, float64s are large enough to 
represent all integers up to and including 9,007,199,254,740,992 exactly. 

The group name `/tiles` is reserved and should be ignored by applications. It is used by the Loom
browser to store 

