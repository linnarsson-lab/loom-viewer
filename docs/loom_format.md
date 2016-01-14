### `.loom` file format

`.loom` files are standard HDF5 files with the following special restrictions:

* The main matrix is stored as `matrix` and is a two-dimensional float32 dataset.
* Row attributes are stored under `/row_attrs/`and `/col_attrs/`, respectively.
* Row and column attributes are one-dimensional HDF5 datasets
  * The datatype must be either `float32` or `string`
  * The number of elements must exactly match the row/column dimensions of the `matrix`



### Python module (`loom.py`)

The `loom.py` module is used to create and read `.loom` files, as well as to convert from legacy `.cef`format.

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
  
#### Connecting to a `.loom` file

        import loom
        ds = loom.connect('cortex.loom')

This opens a connection to the given file, similar to how you would connect to a database. Row and column attributes
are loaded into memory for quick access (but the main data matrix remains on disk until you request it).

#### 


