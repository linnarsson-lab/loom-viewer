from setuptools import setup, find_packages

setup(
    name = "loom",
    version = "0.8.1",
    packages = find_packages(),
    install_requires = [
        'scikit-learn',
        'h5py', 
        'pandas', 
        'scipy',
        'numpy', 
        'progressbar',
        'requests'
    ],
    
    # loom command
    scripts=['loompy/loom'],
    
    # metadata for upload to PyPI
    author = "Gioele La Manno, Job van der Zwan and Sten Linnarsson",
    author_email = "sten.linnarsson@ki.se",
    description = "Create, browse and manipulate .loom files",
    license = "BSD",
    keywords = "loom omics transcriptomics bioinformatics",
    url = "https://github.com/linnarsson-lab/Loom",
)
