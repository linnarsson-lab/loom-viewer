from setuptools import setup, find_packages

setup(
    name = "loompy",
    version = "0.9.5",
    packages = find_packages(),
    install_requires = [
        'scikit-learn',
        'h5py', 
        'pandas', 
        'scipy',
        'numpy', 
        'progressbar',
        'requests',
        'flask-compress'
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
