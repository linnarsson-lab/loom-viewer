# Copyright (c) 2015 Gioele La Manno and Sten Linnarsson
# All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#
# * Redistributions of source code must retain the above copyright notice, this
#   list of conditions and the following disclaimer.
#
# * Redistributions in binary form must reproduce the above copyright notice,
#   this list of conditions and the following disclaimer in the documentation
#   and/or other materials provided with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
# IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
# DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
# FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
# DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
# SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
# CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
# OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
# OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


# HDF5-based file format for storing omics data
#
#	/matrix            Main data matrix, float32, normally cells in columns, genes in rows
#	/row_attrs         Row (gene) attributes 
#             GeneName    Vector of strings
#             Chromosome  Vector of strings
#             Strand
#             Length      Vector of float32 numbers 
#             ...
#   /col_attrs         Column (cell) attributes
#		Tissue
#		Age
#		...
#   /tiles/{z}
#             {x}_{y}     256x256 tile, part of image pyramid

#
# General notes about using HDF5 for storage
#
#   0. HDF5 files are not databases. If you process crashes while writing, the file is toast.
#
#	1. You can add datasets, and you can extend the main matrix by adding new columns,
#	   and you can modify datasets in place, but you should never delete datasets. If
#      you delete a dataset it doesn't really go away so the files would then grow indefinitely.
#
#
#	2. ALWAYS flush after writing to the file
#
#   3. Multiple processes can read from the same HDF5, or one process can read/write,
#      but if one process is writing, no-one else can read OR write.
#




from __future__ import division
import numpy as np
import h5py
import numexpr as ne
import os.path
import pandas as pd
import scipy
import scipy.misc
import scipy.ndimage
from scipy.optimize import minimize
from sklearn.decomposition import IncrementalPCA
from sklearn.manifold import TSNE
from sklearn.metrics.pairwise import pairwise_distances
import __builtin__

pd.set_option('display.multi_sparse', False)

#
# Create a new .loom file from the given data
#
# Arguments:
#
# 	filename	- name of the new file (typically ending in .loom)
#	matrix 		- numpy 2-dimensional ndarray
#	row_attrs 	- dictionary of row attributes {"Attr1": [1,2,32,4,4], ...}
# 	col_attrs 	- dictionary of column attributes {"Attr1": [1,2,32,4,4], ...}
#
def create(filename, matrix, row_attrs, col_attrs):
	if len(row_attrs) == 0:
		raise KeyError, "At least one row attribute must be supplied."
	if len(col_attrs) == 0:
		raise KeyError, "At least one column attribute must be supplied."

	# Create the file
	f = h5py.File(filename, 'w')

	# Save the main matrix
	f.create_dataset('matrix', data=matrix.astype('float32'), dtype='float32', compression='lzf', maxshape=(matrix.shape[0], None), chunks=(10,10))

	# Create the row and columns attributes and associate them with the main matrix 
	f.create_group('/row_attrs')
	for key, vals in row_attrs.iteritems():
		vals = np.array(vals)
		if len(vals) != matrix.shape[0]:
			raise ValueError, ("Row attribute %s has the wrong number of values (%s given, %s expected)" % (key, len(vals), matrix.shape[0]))
		try:
			vals = vals.astype('float32')
		except (ValueError, TypeError):
			vals = vals.astype('S')
		path = '/row_attrs/' + key
		f[path] = vals

	f.create_group('/col_attrs')
	for key, vals in col_attrs.iteritems():
		vals = np.array(vals)
		if len(vals) != matrix.shape[1]:
			raise ValueError, ("Column attribute %s has the wrong number of values (%s given, %s expected)" % (key, len(vals), matrix.shape[1]))
		try:
			vals = vals.astype('float32')
		except (ValueError, TypeError):
			vals = vals.astype('S')
		path = '/col_attrs/' + key
		f.create_dataset(path, data=vals, compression='lzf', maxshape = (None,), chunks = (10,))
		#f[path] = vals

	f.flush()
	f.close()

def create_from_cef(cef_file, loom_file):
	cef = _CEF()
	cef.readCEF(cef_file)
	cef.export_as_loom(loom_file)

def create_from_pandas(df, loom_file):
	n_rows = df.shape[0]
	f = h5py.File(loom_file, "w")
	f.create_group('/row_attrs')
	f.create_group('/col_attrs')
	f.create_dataset('matrix', data=df.values.astype('float32'), compression='lzf', maxshape=(n_rows, None), chunks=(100,100))
	for attr in df.index.names:		
		try:
			f['/row_attrs/' + attr] = df.index.get_level_values(attr).values.astype('float32')
		except ValueError, e:
			f['/row_attrs/' + attr] = df.index.get_level_values(attr).values.astype('string')
	for attr in df.columns.names:		
		try:
			f['/col_attrs/' + attr] = df.columns.get_level_values(attr).values.astype('float32')
		except ValueError, e:
			f['/col_attrs/' + attr] = df.columns.get_level_values(attr).values.astype('string')
	f.close()	
	pass

def connect(filename):
	return LoomConnection(filename)

class LoomConnection(object):
	def __init__(self, filename):
		self.file = h5py.File(filename,'r+')
		self.shape = self.file['matrix'].shape
		self.row_attrs = {}
		for x in self.file['row_attrs'].keys():
			self.row_attrs[x] = self.file['row_attrs'][x][:]

		self.col_attrs = {}
		for x in self.file['col_attrs'].keys():
			self.col_attrs[x] = self.file['col_attrs'][x][:]
	
	def __getitem__(self, slice):
		return self.file['matrix'].__getitem__(slice)

	def add_columns(self, submatrix, col_attrs):
		if submatrix.shape[0] != self.shape[0]:
			raise ValueError, "New submatrix must have same number of rows as existing matrix"

		for key in self.col_attrs.iterkeys():
			if not col_attrs.has_key(key):
				raise KeyError, "Every column attribute must be provided ('%s' is missing)" % key

		for key,vals in col_attrs.iteritems():
			if not self.col_attrs.has_key(key):
				raise KeyError, "Extra column attributes are not allowed ('%s' is not in file)" % key
			if len(vals) != submatrix.shape[1]:
				raise ValueError, "Each column attribute must have exactly %s values" % submatrix.shape[1]

		n_cols = submatrix.shape[1] + self.shape[1]
		for key,vals in col_attrs.iteritems():
			vals = np.array(vals).astype("string" if self.col_attrs[key].dtype.name[0:6] == "string" else "float32")
			self.file['/col_attrs/' + key].resize(n_cols, axis = 0)
			self.file['/col_attrs/' + key][self.shape[1]:] = vals
			self.col_attrs[key] = self.file['/col_attrs/' + key]
		self.file['/matrix'].resize(n_cols, axis = 1)
		self.file['/matrix'][:,self.shape[1]:n_cols] = submatrix
		self.shape = (self.shape[0], n_cols)
		self.file.flush()

	def set_attr(self, name, values, axis = 0):
		# Add annotation along the indicated axis
		if axis == 0:
			if len(values) != self.shape[0]:
				raise ValueError("Row attribute must have %d values" % self.shape[0])
			if self.file['/row_attrs'].__contains__(name):
				del self.file['/row_attrs/' + name]
			self.file['/row_attrs/' + name] = values
			self.row_attrs[name] = self.file['/row_attrs/' + name][:]
		else:
			if len(values) != self.shape[1]:
				raise ValueError("Column attribute must have %d values" % self.shape[1])
			if self.file['/col_attrs'].__contains__(name):
				del self.file['/col_attrs/' + name]
			self.file['/col_attrs/' + name] = values
			self.col_attrs[name] = self.file['/col_attrs/' + name][:]
		self.file.flush()

	def set_attr_bydict(self, name, fromattr, dict, axis = 0, default = None):
		if axis == 0:
			if not self.row_attrs.__contains__(fromattr):
				raise KeyError("Row attribute %s does not exist" % fromattr)
			if default == None:
				values = [dict[x] if dict.__contains__(x) else x for x in self.row_attrs[fromattr]]
			else:
				values = [dict[x] if dict.__contains__(x) else default for x in self.row_attrs[fromattr]]
			self.set_attr(name, values, axis = 0)

		if axis == 1:
			if not self.col_attrs.__contains__(fromattr):
				raise KeyError("Column attribute %s does not exist" % fromattr)
			if default == None:
				values = [dict[x] if dict.__contains__(x) else x for x in self.col_attrs[fromattr]]
			else:
				values = [dict[x] if dict.__contains__(x) else default for x in self.col_attrs[fromattr]]				
			self.set_attr(name, values, axis = 1)
		self.file.flush()

	def select_longform(self, row_expr, col_expr, row_index, col_index, transpose = False):
		# Peform the selection on rows
		rsel = ne.evaluate(row_expr, local_dict=self.row_attrs)
		if rsel.size == 1 and rsel.item() == True:
			rsel = np.ones(self.shape[0], dtype='bool')
		elif rsel.size == 1 and rsel.item() == False:
			rsel = np.zeros(self.shape[0], dtype='bool')
		n_rows = sum(rsel)

		# And on columns
		csel = ne.evaluate(col_expr, local_dict=self.col_attrs)
		if csel.size == 1 and csel.item() == True:
			csel = np.ones(self.shape[1], dtype='bool')
		elif csel.size == 1 and csel.item() == False:
			csel = np.zeros(self.shape[1], dtype='bool')
		n_cols = sum(csel)

		# Collect the right row and column attributes
		rnames = []
		rvalues = []
		if n_rows > 0:
			for key in self.row_attrs.keys():
				rnames.append(key)
				rvalues.append(self.row_attrs[key][rsel])

		cnames = []
		cvalues = []
		if n_cols > 0:
			for key in self.col_attrs.keys():
				cnames.append(key)
				cvalues.append(self.col_attrs[key][csel])

		# If the selection is empty, return an empty Pandas DataFrame
		if n_rows == 0 and n_cols == 0:
			return pd.DataFrame(np.empty([n_rows,n_cols],dtype='float32'))
		if n_rows == 0:
			return pd.DataFrame(np.empty([n_rows,n_cols],dtype='float32'), columns=pd.MultiIndex.from_arrays(cvalues, names=cnames))
		if n_cols == 0:
			return pd.DataFrame(np.empty([n_rows,n_cols],dtype='float32'), index=pd.MultiIndex.from_arrays(rvalues, names=rnames))

		# Load data from file using smallest dimension
		size_byrows = n_rows*self.shape[1]
		size_bycols = n_cols*self.shape[0]

		if size_byrows < size_bycols:
			matrix = self.file['matrix'][rsel, :][:, csel]
		else:
			matrix = self.file['matrix'][:, csel][rsel, :]

		rindex = self.row_attrs[row_index][rsel]
		cindex = self.col_attrs[col_index][csel]
		# Transpose
		if transpose:
			cnames, rnames = rnames, cnames
			cvalues, rvalues = rvalues, cvalues
			n_cols, n_rows = n_rows, n_cols
			csel, rsel = rsel, csel 
			cindex,rindex = rindex,cindex
			matrix = matrix.T
			col_index, row_index = row_index, col_index

		# Now make a DataFrame with column index taken from col_index and the row_attr names, row index from row_index
		df = pd.DataFrame(matrix, index=rindex, columns=cindex)
		for ix in xrange(len(rvalues)): 
			s = pd.Series(np.array(rvalues[ix]), index=rindex, name=rnames[ix])
			df = pd.concat([s, df], axis=1)
		df.index.name = row_index
		return df

	def select(self, row_expr, col_expr):
		# Peform the selection on rows
		rsel = ne.evaluate(row_expr, local_dict=self.row_attrs)
		if rsel.size == 1 and rsel.item() == True:
			rsel = np.ones(self.shape[0], dtype='bool')
		elif rsel.size == 1 and rsel.item() == False:
			rsel = np.zeros(self.shape[0], dtype='bool')
		n_rows = sum(rsel)

		# And on columns
		csel = ne.evaluate(col_expr, local_dict=self.col_attrs)
		if csel.size == 1 and csel.item() == True:
			csel = np.ones(self.shape[1], dtype='bool')
		elif csel.size == 1 and csel.item() == False:
			csel = np.zeros(self.shape[1], dtype='bool')
		n_cols = sum(csel)

		# Collect the right row and column attributes
		rnames = []
		rvalues = []
		if n_rows > 0:
			for key in self.row_attrs.keys():
				rnames.append(key)
				rvalues.append(self.row_attrs[key][rsel])

		cnames = []
		cvalues = []
		if n_cols > 0:
			for key in self.col_attrs.keys():
				cnames.append(key)
				cvalues.append(self.col_attrs[key][csel])

		# If the selection is empty, return an empty Pandas DataFrame
		if n_rows == 0 and n_cols == 0:
			return pd.DataFrame(np.empty([n_rows,n_cols],dtype='float32'))
		if n_rows == 0:
			return pd.DataFrame(np.empty([n_rows,n_cols],dtype='float32'), columns=pd.MultiIndex.from_arrays(cvalues, names=cnames))
		if n_cols == 0:
			return pd.DataFrame(np.empty([n_rows,n_cols],dtype='float32'), index=pd.MultiIndex.from_arrays(rvalues, names=rnames))

		# Load data from file using smallest dimension
		size_byrows = n_rows*self.shape[1]
		size_bycols = n_cols*self.shape[0]

		if size_byrows < size_bycols:
			matrix = self.file['matrix'][rsel, :][:, csel]
		else:
			matrix = self.file['matrix'][:, csel][rsel, :]
		return pd.DataFrame(matrix, index=pd.MultiIndex.from_arrays(rvalues, names=rnames), columns=pd.MultiIndex.from_arrays(cvalues, names=cnames))


	# Return the result of applying f to each row/column, without loading entire dataset into memory
	def apply_chunked(self, f, axis = 0, chunksize = 100000000):
		if axis == 0:
			rows_per_chunk = chunksize//self.shape[1]
			result = np.zeros(self.shape[0])
			ix = 0
			while ix < self.shape[0]:
				rows_per_chunk = min(self.shape[0] - ix, rows_per_chunk)
				chunk = self.file['matrix'][ix:ix + rows_per_chunk,:]
				result[ix:ix + rows_per_chunk] = np.apply_along_axis(f, 1, chunk)
				ix = ix + rows_per_chunk
			return result
		elif axis == 1:
			cols_per_chunk = chunksize//self.shape[0]
			result = np.zeros(self.shape[1])
			ix = 0
			while ix < self.shape[1]:
				cols_per_chunk = min(self.shape[1] - ix, cols_per_chunk)
				chunk = self.file['matrix'][:,ix:ix + cols_per_chunk]
				result[ix:ix + cols_per_chunk] = np.apply_along_axis(f, 0, chunk)
				ix = ix + cols_per_chunk
			return result

	# Compute correlation matrix without casting to float64
	def corr_matrix(self, axis = 0):
		data = self.file['matrix'][:,:]
		if axis == 1:
		    data = data.T
		N = data.shape[1]
		data -= data.mean(axis=1, keepdims=True)
		data = (np.dot(data, data.T) / (N-1))
		d = np.diagonal(data)
		data = data / np.sqrt(np.outer(d,d))
		if axis == 1:
			return data.T
		return np.nan_to_num(data)

	def permute(ordering, axis):
		if axis == 0:
			chunksize = 5000
			start = 0
			while start < self.shape[1]:
				submatrix = self.file('matrix')[:, start:start + chunksize]
				self.file('matrix')[:, start:start + chunksize] = submatrix[ordering, :]
				start = start + chunksize
			self.file.flush()
		if axis == 1:
			chunksize = 100000000//self.shape[1]
			start = 0
			while start < self.shape[0]:
				submatrix = self.file('matrix')[start:start + chunksize, :]
				self.file('matrix')[start:start + chunksize, :] = submatrix[:, ordering]
				start = start + chunksize
			self.file.flush()




	#####################
	# FEATURE SELECTION #
	#####################


	def feature_selection(self, n_genes):
		'''Fits a noise model (CV vs mean)
		Parameters
		----------
			n_genes: integer, number of genes to include

		Returns
		-------
		Nothing, but creates new column attributes _LogMean, _LogCV, _Noise, _Excluded
		'''
		print "Calculating means"
		mu = self.apply_chunked(np.mean)
		print "Calculating CVs"
		cv = self.apply_chunked(np.std)/mu
		log2_m = np.log2(mu)
		log2_m[log2_m == float("-inf")] = 0
		log2_cv = np.log2(cv)
		log2_cv = np.nan_to_num(log2_cv)

		
		#Define the objective function to fit (least squares)
		fun = lambda x, log2_m, log2_cv: sum(abs( np.log2( (2.**log2_m)**(-x[0])+x[1]) - log2_cv ))
		#Fit using Nelder-Mead algorythm
		print "Fitting the noise function"
		x0=[0.5,0.5]
		optimization =  minimize(fun, x0, args=(log2_m,log2_cv), method='Nelder-Mead')
		params = optimization.x
		#The fitted function
		fitted_fun = lambda log_mu: np.log2( (2.**log_mu)**(-params[0]) + params[1])
		# Score is the relative position with respect of the fitted curve
		print "Calculating noise"
		score = np.log2(cv) - fitted_fun(np.log2(mu))
		score = np.nan_to_num(score)
		threshold = np.percentile(score, 100 - n_genes/self.shape[0]*100)
		excluded = (score < threshold).astype('int')

		print "Saving attributes"
		self.set_attr("_LogMean", log2_m, axis = 0)
		self.set_attr("_LogCV", log2_cv, axis = 0)
		self.set_attr("_Noise", score, axis = 0)
		self.set_attr("_Excluded", excluded, axis = 0)		


	########
	# LOOM #
	########

	def loom_prepare(self):
		print "Creating landscape view:"
		if not self.col_attrs.has_key("_tSNE1"):
			self.feature_selection(10000)
			self.project_to_2d()
		print "Creating heatmap."
		if not self.file.__contains__('tiles'):
			self.dz_get_zoom_image(0,0,8)
		print "Done."

	def loom_is_prepared(self):
		return self.file.__contains__('tiles')

	##############
	# PROJECTION #
	##############

	# Create new column attributes _tSNE1, _tSNE2 and _PC1, _PC2
	def project_to_2d(self):
		# First perform PCA out of band
		# Process max 100 MB at a time (assuming about 25000 genes)
		batch_size = 1000
		n_components = 50
		selection = np.ones(self.shape[0]).astype('bool')
		if self.row_attrs.__contains__("_Excluded"):
			selection = (1-self.row_attrs["_Excluded"]).astype('bool')

		print "  Computing %s PCA components." % n_components
		ipca = IncrementalPCA(n_components=n_components)
		col = 0
		while col < self.shape[1]:
			batch = self.file['matrix'][selection,col:col+batch_size].T
			batch = np.log2(batch + 1)
			ipca.partial_fit(batch)
			col = col + batch_size

		# Project to PCA space
		print "  Projecting data to PCA coordinates."
		Xtransformed = []
		col = 0
		while col < self.shape[1]:
			batch = self.file['matrix'][selection,col:col+batch_size].T
			batch = np.log2(batch + 1)
			Xbatch = ipca.transform(batch)
			Xtransformed.append(Xbatch)
			col = col + batch_size
		Xtransformed = np.concatenate(Xtransformed)

		# Save first two dimensions as column attributes
		print "  Saving two first PCA dimensions as column attributes _PC1 and _PC2."
		pc1 = Xtransformed[:,0]	
		pc2 = Xtransformed[:,1]
		self.set_attr("_PC1", pc1, axis = 1)
		self.set_attr("_PC2", pc2, axis = 1)

		# Then, perform tSNE based on the 100 first components
		print "  Computing tSNE based on %s PCA components." % n_components
		# Precumpute the distance matrix
		# This is necessary to work around a bug in sklearn TSNE 0.17
		# (caused because pairwise_distances may give very slightly negative distances)
		dists = pairwise_distances(Xtransformed, metric="correlation")
		np.clip(dists, 0, 1, dists)	
		model = TSNE(metric='precomputed', perplexity=20)
		tsne = model.fit_transform(dists) 
		
		# Save first two dimensions as column attributes
		print "  Saving tSNE dimensions as column attributes _tSNE1 and _tSNE2."
		tsne1 = tsne[:,0]	
		tsne2 = tsne[:,1]	
		self.set_attr("_tSNE1", tsne1, axis = 1)
		self.set_attr("_tSNE2", tsne2, axis = 1)


	#############
	# DEEP ZOOM #
	#############

	def dz_get_max_byrow(self):
		try:
			maxes = self.file['tiles/maxvalues']
		except KeyError:
			maxes = self.apply_chunked(max, 0)
			self.file['tiles/maxvalues'] = maxes
			self.file.flush()
		return maxes

	def dz_get_min_byrow(self):
		try:
			mins = self.file['tiles/minvalues']
		except KeyError:
			mins = self.apply_chunked(min, 0)
			self.file['tiles/minvalues'] = mins
			self.file.flush()
		return mins

	def dz_zoom_range(self):
		return (8, int(max(np.ceil(np.log2(self.shape)))), int(max(np.ceil(np.log2(self.shape)))+8))

	def dz_dimensions(self):
		(y,x) = np.divide(self.shape,256)*256*pow(2,8)
		return (x,y)

	# Returns a PIL image 256x256 pixels
	def dz_get_zoom_image(self, x, y, z):
		if self.file.__contains__("tiles"):
			tile = self.dz_get_zoom_tile(x, y, z)
		else:
			return scipy.misc.toimage(np.zeros((256,256)))
		tile[tile == 255] = 254

		# Crop outside matrix dimensions
		(zmin, zmid, zmax) = self.dz_zoom_range()
		(max_x, max_y) = (int(pow(2,z-zmid)*self.shape[1])-x*256, int(pow(2,z-zmid)*self.shape[0])-y*256)
		if max_x < 0:
			max_x = -1
		if max_y < 0:
			max_y = -1
		if max_x < 255:
			tile[:,max_x+1:256] = 255
		if max_y < 255:
			tile[max_y+1:256,:] = 255
		return scipy.misc.toimage(tile, cmin=0, cmax=255, pal = _bluewhitered)

	# Returns a submatrix scaled to 0-255 range
	def dz_get_zoom_tile(self, x, y, z):
		(zmin, zmid, zmax) = self.dz_zoom_range()
		if z < zmin:
			raise ValueError, ("z cannot be less than %s" % zmin)
		if z > zmax:
			raise ValueError, ("z cannot be greater than %s" % zmax)
		if x < 0:
			raise ValueError, ("x cannot be less than zero")
		if y < 0:
			raise ValueError, ("y cannot be less than zero")

		if z == zmid:
			# Get the right tile from the matrix
			if x*256 > self.shape[1] or y*256 > self.shape[0]:
				return np.zeros((256,256),dtype='float32')
			else:
				tile = self.file['matrix'][y*256:y*256+256,x*256:x*256 + 256]
			# Pad if needed to make it 256x256
			if tile.shape[0] < 256 or tile.shape[1] < 256:
				tile = np.pad(tile,((0,256-tile.shape[0]),(0,256-tile.shape[1])),'constant',constant_values=0)
			# Rescale
			maxes = self.dz_get_max_byrow()[y*256:y*256+256]
			mins = self.dz_get_min_byrow()[y*256:y*256+256]
			if maxes.shape[0] < 256:
				maxes = np.pad(maxes, (0, 256 - maxes.shape[0]), 'constant', constant_values = 0)
				mins = np.pad(mins, (0, 256 - mins.shape[0]), 'constant', constant_values = 0)
			tile = (np.log2(tile.transpose()-mins+1)/np.log2(maxes-mins+1)*255).transpose()
			#tile = (tile+1)/(maxes+1)*256
			return tile

		if z > zmid:
			scale = pow(2,z - zmid)
			# Get the z = zmid tile that contains this tile
			x1_tile = self.dz_get_zoom_tile(x//scale,y//scale,zmid)
			# Take the right submatrix
			x = x - x//scale*scale # This works because of rounding down at the first division
			y = y - y//scale*scale
			tile = x1_tile[y*256//scale:y*256//scale + 256//scale, x*256//scale:x*256//scale + 256//scale]
			# Resample
			for ix in xrange(z - zmid):
				temp = np.empty((tile.shape[0]*2, tile.shape[1]*2) , dtype='float32')
				temp[0::2,0::2] = tile
				temp[1::2,1::2] = tile
				temp[0::2,1::2] = tile
				temp[1::2,0::2] = tile
				tile = temp
			return tile

		if z < zmid:
			# Get the tile from cache if possible
			try:
				tile = self.file['tiles/%sz/%sx_%sy' % (z, x, y)][:,:]
			except KeyError:
			# Get the four less zoomed-out tiles required to make this tile
				temp = np.empty((512,512), dtype = 'float32')
				temp[0:256,0:256] = self.dz_get_zoom_tile(x*2,y*2,z+1)
				temp[0:256,256:512] = self.dz_get_zoom_tile(x*2 + 1,y*2,z+1)
				temp[256:512,0:256] = self.dz_get_zoom_tile(x*2,y*2 + 1,z+1)
				temp[256:512,256:512] = self.dz_get_zoom_tile(x*2+1,y*2+1,z+1)
				tile = temp[0::2,0::2]
				f.create_dataset('tiles/%sz/%sx_%sy' % (z, x, y), data=tile, compression='lzf')
				# self.file['tiles/%sz/%sx_%sy' % (z, x, y)] = tile
				self.file.flush()
			return tile
	def view(where, orderby, axis = 0):
		return LoomView(self, where, orderby, axis)

class LoomView(object):
	def __init__(self, parent, where_rows, order_rows_by, where_columns, order_columns_by):
		# Peform the selection on rows
		rsel = ne.evaluate(where_rows, local_dict=parent.row_attrs)
		if rsel.size == 1 and rsel.item() == True:
			rsel = np.ones(self.shape[0], dtype='bool')
		elif rsel.size == 1 and rsel.item() == False:
			rsel = np.zeros(self.shape[0], dtype='bool')
		n_rows = sum(rsel)

		# And on columns
		csel = ne.evaluate(where_columns, local_dict=self.col_attrs)
		if csel.size == 1 and csel.item() == True:
			csel = np.ones(self.shape[1], dtype='bool')
		elif csel.size == 1 and csel.item() == False:
			csel = np.zeros(self.shape[1], dtype='bool')
		n_cols = sum(csel)

		# Collect the right row and column attributes
		self.row_attrs = {}
		for key in parent.row_attrs.keys():
			if n_rows > 0:
				self.row_attrs[key] = self.row_attrs[key][rsel]
			else:
				self.row_attrs[key] = np.array([], dtype = parent.row_attrs[key].dtype)

		self.col_attrs = {}
		for key in parent.col_attrs.keys():
			if n_cols > 0:
				self.col_attrs[key] = self.col_attrs[key][csel]
			else:
				self.col_attrs[key] = np.array([], dtype = parent.row_attrs[key].dtype)

		self.parent = parent
		self.shape = (n_rows, n_cols)
		self.row_ordering = XXXXXXXXXXXXXXXX
		self.col_ordering = XXXXXXXXXXXXXXXX

	def get(row, col):
		return self.parent.get(self.row_ordering[row], self.col_ordering[col])
		

class _CEF(object):
	def __init__(self):
		self.headers = 0
		self.row_attr = 0
		self.col_attr = 0
		self.rows = 0
		self.cols = 0
		self.flags = 0
		self.tab_fields = 7

		self.header_names = []
		self.header_values = []

		self.row_attr_names = []
		self.row_attr_values = []

		self.col_attr_names = []
		self.col_attr_values = []

		self.matrix = []

	def export_as_loom(self, filename):
		create(filename, self.matrix, dict(zip(self.row_attr_names, self.row_attr_values)), dict(zip(self.col_attr_names, self.col_attr_values)))

	def add_header(self, name, value):
		self.header_names.append(name)
		self.header_values.append(value)

	def add_row_attr(self, name, value):
		self.row_attr_names.append(name)
		self.row_attr_values.append(list(value))

	def add_col_attr(self, name, value):
		self.col_attr_names.append(name)
		self.col_attr_values.append(list(value))

	def set_matrix(self, matrix):
		for row in matrix:
			self.matrix.append(list(row))

	def readCEF(self, filepath, matrix_dtype = 'auto'):
		#Delete all the stored information
		self.__init__()
		#Start parsing
		with __builtin__.open(filepath, 'rbU') as fin:
			# Read cef file first line
			self.header, self.row_attr, self.col_attr, self.rows,\
			self.cols, self.flags = fin.readline().rstrip('\n').split('\t')[1:7]
			self.header = int(self.header)
			self.row_attr = int( self.row_attr )
			self.col_attr = int(self.col_attr)
			self.rows = int(self.rows)
			self.cols = int(self.cols)
			self.flags = int(self.flags)
			self.row_attr_values = [[] for _ in xrange(self.row_attr)]
			self.matrix = np.empty([self.rows, self.cols], dtype='float32')

			# Read header
			for i in range(self.header):
				name, value = fin.readline().rstrip('\n').split('\t')[:2]
				self.header_names.append(name)
				self.header_values.append(value)
			# Read col attr
			for i in range(self.col_attr):
				line_col_attr = fin.readline().rstrip('\n').split('\t')[self.row_attr:self.row_attr+1+self.cols]
				self.col_attr_names.append( line_col_attr[0] )
				self.col_attr_values.append( line_col_attr[1:] ) 
			#Read row attr and matrix
			self.row_attr_names += fin.readline().rstrip('\n').split('\t')[:self.row_attr]
			for ix in xrange(self.rows):
				linelist = fin.readline().rstrip('\n').split('\t')
				for n, entry in enumerate( linelist[:self.row_attr] ):
					self.row_attr_values[n].append( entry )
				try:
					self.matrix[ix] = [float(el) for el in linelist[self.row_attr+1:self.row_attr+1+self.cols]]
				except ValueError:
					print repr(el), ' is invalid at row ', ix



_bluewhitered = np.array([[ 19,  74, 133],
	   [ 32, 100, 169],
	   [ 48, 122, 183],
	   [ 64, 143, 194],
	   [ 96, 166, 206],
	   [136, 191, 220],
	   [168, 209, 229],
	   [198, 224, 238],
	   [221, 235, 243],
	   [239, 244, 247],
	   [ 17,  70, 127],
	   [ 18,  72, 130],
	   [ 19,  74, 133],
	   [ 20,  76, 136],
	   [ 21,  78, 139],
	   [ 22,  81, 142],
	   [ 23,  83, 145],
	   [ 24,  85, 148],
	   [ 25,  87, 151],
	   [ 26,  89, 154],
	   [ 28,  91, 157],
	   [ 29,  93, 160],
	   [ 30,  95, 163],
	   [ 31,  98, 166],
	   [ 32, 100, 169],
	   [ 33, 102, 172],
	   [ 34, 104, 174],
	   [ 36, 106, 175],
	   [ 37, 107, 175],
	   [ 38, 109, 176],
	   [ 40, 111, 177],
	   [ 41, 113, 178],
	   [ 42, 114, 179],
	   [ 44, 116, 180],
	   [ 45, 118, 181],
	   [ 46, 120, 182],
	   [ 48, 122, 183],
	   [ 49, 123, 184],
	   [ 50, 125, 184],
	   [ 52, 127, 185],
	   [ 53, 129, 186],
	   [ 54, 130, 187],
	   [ 56, 132, 188],
	   [ 57, 134, 189],
	   [ 58, 136, 190],
	   [ 60, 137, 191],
	   [ 61, 139, 192],
	   [ 62, 141, 193],
	   [ 64, 143, 194],
	   [ 65, 145, 194],
	   [ 66, 146, 195],
	   [ 68, 148, 196],
	   [ 71, 150, 197],
	   [ 74, 152, 198],
	   [ 77, 154, 199],
	   [ 80, 156, 201],
	   [ 83, 158, 202],
	   [ 86, 160, 203],
	   [ 90, 162, 204],
	   [ 93, 164, 205],
	   [ 96, 166, 206],
	   [ 99, 168, 207],
	   [102, 170, 208],
	   [105, 172, 209],
	   [108, 174, 210],
	   [111, 176, 211],
	   [114, 178, 212],
	   [118, 180, 213],
	   [121, 182, 214],
	   [124, 184, 215],
	   [127, 185, 216],
	   [130, 187, 218],
	   [133, 189, 219],
	   [136, 191, 220],
	   [139, 193, 221],
	   [142, 195, 222],
	   [146, 197, 223],
	   [148, 199, 224],
	   [151, 200, 224],
	   [153, 201, 225],
	   [156, 203, 226],
	   [158, 204, 227],
	   [161, 205, 227],
	   [163, 206, 228],
	   [166, 208, 229],
	   [168, 209, 229],
	   [171, 210, 230],
	   [173, 212, 231],
	   [176, 213, 232],
	   [178, 214, 232],
	   [181, 215, 233],
	   [183, 217, 234],
	   [186, 218, 234],
	   [188, 219, 235],
	   [190, 220, 236],
	   [193, 222, 236],
	   [195, 223, 237],
	   [198, 224, 238],
	   [200, 225, 239],
	   [203, 227, 239],
	   [205, 228, 240],
	   [208, 229, 241],
	   [210, 230, 241],
	   [212, 231, 242],
	   [213, 232, 242],
	   [215, 233, 242],
	   [216, 233, 243],
	   [218, 234, 243],
	   [219, 235, 243],
	   [221, 235, 243],
	   [222, 236, 244],
	   [224, 237, 244],
	   [225, 237, 244],
	   [227, 238, 244],
	   [228, 239, 245],
	   [230, 240, 245],
	   [231, 240, 245],
	   [233, 241, 246],
	   [234, 242, 246],
	   [236, 242, 246],
	   [237, 243, 246],
	   [239, 244, 247],
	   [240, 245, 247],
	   [242, 245, 247],
	   [243, 246, 248],
	   [245, 247, 248],
	   [246, 247, 248],
	   [248, 248, 248],
	   [249, 248, 248],
	   [249, 247, 246],
	   [249, 246, 244],
	   [249, 245, 242],
	   [250, 244, 240],
	   [250, 242, 238],
	   [250, 241, 236],
	   [250, 240, 234],
	   [250, 239, 232],
	   [251, 238, 231],
	   [251, 237, 229],
	   [251, 236, 227],
	   [251, 235, 225],
	   [252, 234, 223],
	   [252, 232, 221],
	   [252, 231, 219],
	   [252, 230, 217],
	   [253, 229, 215],
	   [253, 228, 214],
	   [253, 227, 212],
	   [253, 226, 210],
	   [254, 225, 208],
	   [254, 224, 206],
	   [254, 223, 204],
	   [254, 221, 202],
	   [254, 220, 200],
	   [254, 218, 198],
	   [254, 216, 195],
	   [253, 214, 192],
	   [253, 212, 189],
	   [253, 210, 187],
	   [252, 208, 184],
	   [252, 205, 181],
	   [252, 203, 179],
	   [251, 201, 176],
	   [251, 199, 173],
	   [251, 197, 170],
	   [250, 195, 168],
	   [250, 193, 165],
	   [250, 191, 162],
	   [249, 188, 160],
	   [249, 186, 157],
	   [248, 184, 154],
	   [248, 182, 151],
	   [248, 180, 149],
	   [247, 178, 146],
	   [247, 176, 143],
	   [247, 174, 141],
	   [246, 171, 138],
	   [246, 169, 135],
	   [246, 167, 132],
	   [245, 165, 130],
	   [244, 162, 128],
	   [243, 159, 126],
	   [241, 157, 124],
	   [240, 154, 122],
	   [239, 151, 120],
	   [238, 148, 117],
	   [237, 146, 115],
	   [235, 143, 113],
	   [234, 140, 111],
	   [233, 138, 109],
	   [232, 135, 107],
	   [231, 132, 105],
	   [230, 129, 103],
	   [228, 127, 101],
	   [227, 124,  99],
	   [226, 121,  97],
	   [225, 119,  94],
	   [224, 116,  92],
	   [222, 113,  90],
	   [221, 110,  88],
	   [220, 108,  86],
	   [219, 105,  84],
	   [218, 102,  82],
	   [217, 100,  80],
	   [215,  97,  78],
	   [214,  94,  76],
	   [213,  91,  75],
	   [211,  88,  74],
	   [210,  86,  72],
	   [208,  83,  71],
	   [207,  80,  70],
	   [205,  77,  68],
	   [204,  74,  67],
	   [203,  71,  66],
	   [201,  69,  64],
	   [200,  66,  63],
	   [198,  63,  62],
	   [197,  60,  60],
	   [195,  57,  59],
	   [194,  54,  58],
	   [193,  52,  56],
	   [191,  49,  55],
	   [190,  46,  54],
	   [188,  43,  52],
	   [187,  40,  51],
	   [186,  37,  50],
	   [184,  35,  48],
	   [183,  32,  47],
	   [181,  29,  46],
	   [180,  26,  44],
	   [178,  24,  43],
	   [175,  23,  43],
	   [172,  22,  42],
	   [169,  21,  42],
	   [166,  20,  42],
	   [163,  19,  41],
	   [160,  18,  41],
	   [157,  18,  40],
	   [154,  17,  40],
	   [151,  16,  39],
	   [148,  15,  39],
	   [145,  14,  38],
	   [142,  13,  38],
	   [139,  12,  37],
	   [136,  11,  37],
	   [133,  10,  36],
	   [130,   9,  36],
	   [128,   8,  35],
	   [125,   7,  35],
	   [122,   6,  34],
	   [119,   5,  34],
	   [116,   4,  34],
	   [113,   3,  33],
	   [110,   2,  33],
	   [107,   1,  32],
	   [221, 221, 221]])
