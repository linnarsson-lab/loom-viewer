from setuptools import setup, find_packages

# pylint: disable=exec-used
exec(open('loompy/_version.py').read())

setup(
    name = "loompy",
    version = __version__,
    packages = find_packages(),
    install_requires = [
        'scikit-learn',
        'h5py', 
        'pandas', 
        'scipy<=0.17.1',
        'numpy', 
        'progressbar',
        'requests',
        'flask-compress',
        'PyMySQL'
    ],
    
    # loom command
    scripts=['loompy/loom'],
    
    # static files from MANIFEST.in
    include_package_data = True,

    # metadata for upload to PyPI
    author = "Linnarsson Lab",
    author_email = "sten.linnarsson@ki.se",
    description = "Create, browse and manipulate .loom files",
    license = "BSD",
    keywords = "loom omics transcriptomics bioinformatics",
    url = "https://github.com/linnarsson-lab/Loom",
)
