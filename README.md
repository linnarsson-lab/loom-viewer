# Loom

Loom is 

* A browser for working with large-scale single-cell RNA-seq datasets
* A command-line tool for manipulating `.loom` files. 
* A Python library for creating and working with data in `.loom` format.


## Installation

1. Install a scientific Python v2.7 distribution such as [Anaconda](https://www.continuum.io/downloads).
2. Install Loom 

```bash
pip install loompy
```


## Getting started

### Using the Loom browser

Open your terminal, and type

```bash
loom
```

To learn more about the Loom browser, read the [Documentation](docs/loom_browser.md).

### Using the `loom` command-line tool

Open your terminal, and type:

```bash
loom --help
```

To learn more about the `loom` command-line tool, read the [Documentation](docs/loom_cmd.md).

### Using the `loompy` Python package

1. Start a Jupyter Notebook, in your terminal:

```python
jupyter notebook
```

2. Import `loompy`

```python
import loompy
```

3. Connect to a dataset

```python
ds = loompy.connect("filename.loom")
```

To learn more about the `loompy` package, , read the [Documentation](docs/loompy.md).

