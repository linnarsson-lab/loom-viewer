### `.loom` User Guide

We had previously created the CEF format as a standard for interchange of large-scale gene expression data.
However, as datasets grow beyond thousands of samples and approach millions, CEF is no longer up to the task. 
CEF files must always be loaded into memory, which is slow and may sometimes be impossible. Therefore, we 
are experimenting with a new format that supports compression and efficient (chunked) random access.

Like CEF, `.loom` files store a matrix of numbers along with row and column attributes. Typically, rows
represent genes and have attributes such as `GeneName`, `Chromosome`, `Strand`, etc. Columns usually represent
cells (or, more generally, samples) and may have attributes such as `CellID`, `Strain`, `Sex`, `Age`, etc. 
`.loom` files are standard [HDF5](https://www.hdfgroup.org) files with the following special restrictions:

* The main matrix is stored as `/matrix` and is a two-dimensional float32 HDF5 Dataset.
* Row and column attributes are stored under `/row_attrs/`and `/col_attrs/`, respectively.
* Row and column attributes are one-dimensional HDF5 Datasets
  * Attribute values must be either all `float32` or all `string`
  * The number of elements must exactly match the row/column dimensions of the `matrix`
* Two attributes are required:
  * Column attribute `CellID` of type `string`. Values must be distinct.
  * Row attribute `Gene` of type `string`. Values must be distinct, and typically should be official gene symbols.

### Python module (`loom.py`)

The `loom.py` module is used to create and read `.loom` files, as well as to convert from legacy `.cef` format.

#### Getting started

  1. Install [Anaconda](https://www.continuum.io/downloads) for Python 2.7. 
  2. Make sure you have all necessary modules (run this in Terminal):

        conda install numpy
        conda install scipy
        conda install sklearn
        conda install numexpr
        conda install pandas
  
  3. Make sure you have `loom.py` and `bh_tsne.py` in a folder in your `PATH`
  4. Get some data in `.loom` format (or create from `.cef`, see below)

#### Creating `.loom` files

##### Create `.loom` from Python raw data

        loom.create(filename, matrix, row_attrs, col_attrs)
           filename  - path to the new .loom file
           matrix    - numpy 2D array of float32 numbers
           row_attrs - dictionary of row attributes, where values are numpy 1D arrays of float32 or string
           col_attrs - dictionary of column attributes, where values are numpy 1D arrays of float32 or string

The file is created, but nothing is returned. To work with the new file, use `loom.connect(filename)` (see below).

##### Create `.loom` from `.cef`

        loom.create_from_cef(cef_file, loom_file)
           cef_file     - path to the .cef file
           loom_file    - path to the new .loom file

The file is created, but nothing is returned. To work with the new file, use `loom.connect(loom_file)` (see below).

##### Create `.loom` from [Pandas](http://pandas.pydata.org)

        create_from_pandas(df, loom_file)
          df         - Pandas DataFrame object
          loom_file  - path to the new .loom file

The Pandas DataFrame can contain multi-indexes (both rows and columns), which will be turned into multiple
row and column attributes. The main matrix must be all-numerical (no strings) and will be cast to `float32`.
The file is created, but nothing is returned. To work with the new file, use `loom.connect(filename)` (see below).

#### Working with `.loom` files

**Caution:** .loom files are based on HDF5, and are not databases. They do not support transactions, journaling, or
concurrent read/write access. If your script crashes (or you terminate it) while writing to a `.loom` file,
the file **will be corrupted** and your data will be lost! You should treat `.loom` files as perishable
and always keep the original raw data in a proper database.

##### Connect to a `.loom` file

        import loom
        ds = loom.connect('cortex.loom')

This opens a connection to the given file, similar to how you would connect to a database. Row and column attributes
are loaded into memory for quick access, but the main data matrix remains on disk until you request it. The function
returns an object of type `<LoomConnection>`.

You can read the `shape` property to see the row and column counts:

        ds.shape
        >>> (21135, 3005)

##### Work with row and column attributes

Row and column attributes are now accessible as dictionaries on the `ds` object. You can list their names:

        ds.row_attrs.keys()
        >>> {u'Gene', u'GeneGroup', u'GeneType'}
        
        ds.col_attrs.keys()
        >>> {u'Age',
        >>> u'CellID',
        >>> u'Class',
        >>> u'Diameter',
        >>> u'Group',
        >>> u'Sex',
        >>> u'Subclass',
        >>> u'Tissue',
        >>> u'Total_mRNA',
        >>> u'Well'}

Get all the values for a given attribute:

        ds.col_attrs["Class"]
        >>> array(['interneurons', 'interneurons', 'interneurons', ...,
        >>> 'endothelial-mural', 'endothelial-mural', 'endothelial-mural'], 
        >>> dtype='|S20')

##### Select data

To load data from a `.loom` file, use the `select` method:

        <LoomConnection>.select(row_query, col_query)

`row_query` and `col_query` are query strings in [Numexpr](https://github.com/pydata/numexpr/wiki/Numexpr-Users-Guide) format.
You can use all the row (columm) attributes in your query, as well as logical operators such as `& | ~`. See the [Numexpr User Guide](https://github.com/pydata/numexpr/wiki/Numexpr-Users-Guide#supported-operators) for the detailed syntax.

Here's an example that selects mitochondrial genes in microglia:

    <LoomConnection>.select("GeneType=='Mitochondrial'","Class=='microglia'")

The returned object is a Pandas DataFrame, with multi-indexes along both rows and columns. Note that this is an abuse of the 
semantics of the Pandas DataFrame, because Pandas assumes multi-indexes are hierarchical, whereas there is no guarantee that
`.loom` attributes form a hierarchy. Sometimes this can make the result awkward to work with in Pandas and other pydata 
modules. For this reason, we also support the `select_longform` method: 

    <LoomConnection>.select_longform(row_expr, col_expr, row_index, col_index, transpose = False)

This method selects rows and columns as before, but retains only a single row and column attribute (which you chose by
providing `row_index` and `col_index`) as the Pandas DataFrame indexes. All other column attributes are dropped, and all 
additional row attributes are converted to regular columns in the DataFrame. If `transpose == True`, the matrix is 
transposed before dropping extra attributes. 

The result is a DataFrame with a single column index, and with extra columns on the left corresponding to the row 
attributes. This format is sometimes called Pandas [long format](http://pandas.pydata.org/pandas-docs/stable/generated/pandas.melt.html),
and is suitable for plotting e.g. with [Seaborn](http://stanford.edu/~mwaskom/software/seaborn/).

#### Add attributes and data

##### Set the values of an attribute

    <LoomConnection>.set_attr(name, values, axis = 0)

You must specify the axis (0 for rows, 1 for columns). A new attribute will be created if it doesn't exist.

##### Set an attribute by projecting the values of an existing attribute

    <LoomConnection>.set_attr_bydict(name, fromattr, dict, axis = 0, default = None)
       name        - name of the new attribute (can be same as fromattr)
       fromattr    - the attribute to project from
       dict        - the mapping of values in fromattr to new values
       axis        - the axis (0 for rows, 1 for columns)
       default     - default to use for values not in dict (if default == None, keep original value)

This can be used for example to fix typos in attribute values (e.g. by mapping 'mircoglia' to 'microglia').

##### Extend the dataset with new columns

    <LoomConnection>.add_columns(submatrix, col_attrs)

You need to supply a submatrix of N rows and M columns, where N is equal to the existing row count. You must also supply 
column attributes (as a dictionary) corresponding to all the existing column attributes, and with exactly M values each
of the same type as the corresponding existing attribute. The new data will be appended and saved to disk.


