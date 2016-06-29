
import loom
import scipy
import scipy.misc
import scipy.ndimage
from scipy.optimize import minimize
from scipy import sparse
import scipy.csgraph
from sklearn.decomposition import IncrementalPCA
from sklearn.manifold import TSNE
from sklearn.metrics.pairwise import pairwise_distances
import hdbscan
import numpy as np
from cmdstan import CmdStan
import loom
from annoy import AnnoyIndex

bnnmf = """
	# Factorize a gene expression matrix into the product of gene and cell vectors

	data {
		int <lower=0> G;                    # number of genes
		int <lower=0> C;                    # number of cells
		int <lower=0> y[G, C];              # observed molecule counts
	}

	parameters {
		vector <lower=0,upper=1> [C] alpha;         # coefficient for each cell
		row_vector <lower=1> [G] beta;      # coefficient for each gene
		real <lower=0> r;                   # overdispersion
	}

	model {
		row_vector [C] mu[G];
		real rsq;

		# Noise model
		r ~ cauchy(0,1);
		rsq <- square(r + 1) - 1;

		# Matrix factorization
		beta ~ cauchy(1, 5);
		alpha ~ beta(0.5,1.5); #cauchy(0, 5);

		for (g in 1:G) {
			# compute hidden expression level
			mu[g] <- (alpha * beta[g])';

			# observations are NB-distributed with noise
			y[g] ~ neg_binomial(mu[g] / rsq, 1 / rsq);
		}
	}
"""


class TsModel(object):

	def __init__(self, loom_file, recompile=False):
	"""
		Create a new TsModel using the given .loom file as input
		
		Args:
			loom_file (string):		Full path to .loom file
			recompile (bool):		If true, recompile the Stan model
	
	"""
		self.data = loom.connect(loom_file)
		self.regulon_labels = np.zeros((self.data.shape[0],))
		self.MkNN =  None
		if recompile:
			stan = CmdStan()
			stan.compile("bnnmf", bnnmf)

	def find_regulons(self, pca_components=200, perplexity=20, min_regulon_size=10):
		"""
		Discover sets of co-regulated genes (regulons) across the full dataset
		
		Args:
			pca_components (int):	Number of PCA components to use for t-SNE
			perplexity (int):		Perplexity to use for t-SNE
			min_regulon_size (int):	Minimum number of genes per regulon
			
		Returns:
			regulon_labels (list of int):	Label assignments for each gene
			
		This method first computes a PCA incrementally (without loading the entire dataset in RAM),
		then projects to 2D using t-SNE, and finally finds density clusters using HDBSCAN.
		"""
		# First perform incremental PCA on genes
		batch_size = 100

		ipca = IncrementalPCA(n_components=pca_components)
		row = 0
		while row < self.data.shape[0]:
			batch = self.data[row:row+batch_size,:]
			batch = np.log2(batch + 1)
			ipca.partial_fit(batch)
			row = row + batch_size

		# Project to PCA space
		Xtransformed = []
		row = 0
		while row < self.data.shape[0]:
			batch = self.data[row:row+batch_size]
			batch = np.log2(batch + 1)
			Xbatch = ipca.transform(batch)
			Xtransformed.append(Xbatch)
			row = row + batch_size
		Xtransformed = np.concatenate(Xtransformed)
		# Shape of Xtransformed will be (n_genes, pca_components) i.e. about 25k by 500 

		# Then, perform tSNE based on the top components
		# Precumpute the distance matrix
		# This is necessary to work around a bug in sklearn TSNE 0.17
		# (caused because pairwise_distances may give very slightly negative distances)
		dists = pairwise_distances(Xtransformed, metric="correlation")
		np.clip(dists, 0, 1, dists)	
		model = TSNE(metric='precomputed', perplexity=perplexity)
		tsne = model.fit_transform(dists) 
		
		# Then, use HDBSCAN to identify gene clusters in t-SNE space
		hdb = hdbscan.HDBSCAN(min_cluster_size=min_regulon_size)
		self.regulon_labels = hdb.fit_predict(tsne)

	def factorize_regulons(self):
		temp = []
		for r in set(self.regulon_labels):
			temp.append(self._factorize_regulon(r).mean(axis=1))
		self.regulon_factors = np.array(temp)

	def _factorize_regulon(self, label):
		"""
		Factorize the given regulon using bayesian non-negative matrix factorization

		Args:
			label (int):	The regulon to factorize

		"""
		# TODO: truncate list of genes to max m genes to save on RAM
		genes = (self.regulons == label)
		if not genes.any():
			raise ValueError("Regulon doesn't exist")

		y = self.data[genes, :]
		c = y.shape[1]
		g = y.shape[0]
		data = {
			"C": c,
			"G": g,
			"y": y
		}
		stan = CmdStan()
		result = stan.fit("bnnmf", data, method="sample", debug=False)
		return result["alpha"]

	def state_space(self, genes, k):
		"""
		Compute a state-space graph based on the given set of genes
		
		Args:
			genes (numpy array of bool):		The gene selection
			k (int):							Number of nearest neighbours to consider
		"""

		if len(genes) == 0:
			raise ValueError("No genes were selected")
		
		annoy = AnnoyIndex(genes.sum(), metric = "angular")
		for i in xrange(self.data.shape[1]):
			vector = self.data[genes, i]
			annoy.add(i, vector)
		
		annoy.build(10)

		# TODO: save the index, then use multiple cores to search it 

		# Compute kNN and distances for each cell, in sparse matrix IJV format
		d = self.data.shape[i]
		I = np.empty(d*k)
		J = np.empty(d*k)
		V = np.empty(d*k)
		for i in xrange(d):	
			(nn, w) = annoy.get_nns_by_item(i, k), include_distances = True)
			I[i*k:i*(k+1)] = [i]*k
			J[i*k:i*(k+1)] = nn
			V[i*k:i*(k+1)] = w

		kNN = sparse.coo_matrix((V,(I,J)),shape=(d,d))

		# Compute Mutual kNN
		kNN = kNN.tocsr()
		t = kNN.transpose(copy=True)
		self.MkNN = 1 - (kNN * t) # This removes all edges that are not reciprocal, and converts distances to similarities

	def tda(self):
		# Compute the connected components of the MkNN graph
		(n, labels) = csgraph.connected_components(self.MkNN)


		