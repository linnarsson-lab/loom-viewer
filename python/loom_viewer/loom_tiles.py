import os
import errno
import h5py
import numpy as np
import scipy
import logging
from shutil import rmtree
from typing import *

from loompy import LoomConnection


class LoomTiles(object):
	#############
	# DEEP ZOOM #
	#############
	__slots__ = [
		'ds',
		'_maxes',
		'_mins'
	]

	def __init__(self, ds: LoomConnection) -> None:
		self.ds = ds
		self._maxes = None  # type: np.ndarray
		self._mins = None

	def maxes(self) -> Any:
		if self._maxes is None:
			# colormax = np.percentile(data, 99, axis=1) + 0.1
			# minFloat = np.finfo(float).eps;
			# def percentileMap(data):
			# 	return np.percentile(data, 99, axis=1) + minFloat;

			# Prefer using numpy's built-in method for finding the
			# max values faster
			# self._maxes = self.ds.map([max], 0)[0]

			logging.info('calculating & caching max values')
			rows = self.ds.shape[0]
			_maxes = np.zeros(rows)
			ix = 0
			while ix < rows:
				rows_per_chunk = min(rows - ix, 64)
				chunk = self.ds[ix:ix + rows_per_chunk, :]
				_maxes[ix:ix + rows_per_chunk] = np.nanmax(chunk, axis=1)
				ix += rows_per_chunk
				print('.', end='', flush=True)
			self._maxes = _maxes
			print(' done\n\n')
		return self._maxes

	def mins(self) -> Any:
		if self._mins is None:
			# self._mins = self.ds.map([min], 0)[0]
			logging.info('calculating & caching min values')
			rows = self.ds.shape[0]
			_mins = np.zeros(rows)
			ix = 0
			while ix < rows:
				rows_per_chunk = min(rows - ix, 64)
				chunk = self.ds[ix:ix + rows_per_chunk, :]
				_mins[ix:ix + rows_per_chunk] = np.nanmin(chunk, axis=1)
				ix += rows_per_chunk
				print('.', end='', flush=True)
			self._mins = _mins
			print(' done\n\n')
		return self._mins

	def prepare_heatmap(self, truncate: bool = False) -> None:
		tile_dir = "%s.tiles/" % (self.ds.filename)
		if os.path.isdir(tile_dir):
			logging.info("  Previous tile folder found at %s)", tile_dir)
			if truncate:
				logging.info("    Truncate set, removing old tile folder")
				rmtree(tile_dir)
			else:
				logging.info("    Call prepare_heatmap(truncate=True) to overwrite")
				return

		self.maxes()

		self.mins()

		logging.info('  Generating and saving tiles')

		self.dz_get_zoom_tile(0, 0, 8, truncate)
		print(" done\n\n")

	def dz_zoom_range(self) -> Tuple[int, int, int]:
		"""
		Determine the zoom limits for this file.

		Returns:
			Tuple (middle, min_zoom, max_zoom) of integer zoom levels.
		"""
		return (8, int(max(np.ceil(np.log2(self.ds.shape)))), int(max(np.ceil(np.log2(self.ds.shape))) + 8))

	def dz_dimensions(self) -> Tuple[int, int]:
		"""
		Determine the total size of the deep zoom image.

		Returns:
			Tuple (x,y) of integers
		"""
		(y, x) = np.divide(self.ds.shape, 256) * 256 * pow(2, 8)
		return (x, y)

	def dz_tile_to_image(self, x: int, y: int, z: int, tile: Any) -> Any:
		# Crop outside matrix dimensions
		(zmin, zmid, zmax) = self.dz_zoom_range()
		(max_x, max_y) = (int(pow(2, z - zmid) * self.ds.shape[1]) - x * 256, int(pow(2, z - zmid) * self.ds.shape[0]) - y * 256)
		if max_x < 0:
			max_x = -1
		if max_y < 0:
			max_y = -1
		if max_x < 255:
			tile[:, max_x + 1:256] = 255
		if max_y < 255:
			tile[max_y + 1:256, :] = 255
		return scipy.misc.toimage(tile, cmin=0, cmax=255, pal=_viridis)

	def dz_save_tile(self, x: int, y: int, z: int, tile: Any, truncate: bool = False) -> Any:
		(zmin, zmid, zmax) = self.dz_zoom_range()
		if (
			z < zmin or z > zmid or
			x < 0 or y < 0 or
			x * 256 * 2**(zmid - z) > self.ds.shape[1] or
			y * 256 * 2**(zmid - z) > self.ds.shape[0]
		):
			# logging.info("Trying to save out of bound tile: x: %02d y: %02d z: %02d" % (x, y, z))
			return

		tile_dir = '%s.tiles/z%02d/' % (self.ds.filename, z)
		tile_path = '%sx%03d_y%03d.png' % (tile_dir, x, y)

		# make sure the tile directory exists
		# we use a try/error approach so that we
		# don't have to worry about race conditions
		# (if another process creates the same
		#  directory we just catch the exception)
		try:
			os.makedirs(tile_dir, exist_ok=True)
		except OSError as exception:
			# if the error was that the directory already
			# exists, ignore it, since that is expected.
			if exception.errno != errno.EEXIST:
				raise

		if os.path.isfile(tile_path):
			if truncate:
				# remove old file
				os.remove(tile_path)
			else:
				# load old file instead of generating new image
				return scipy.misc.imread(tile_path, mode='P')

		img = self.dz_tile_to_image(x, y, z, tile)
		# save to file
		with open(tile_path, 'wb') as img_io:
			# logging.info("saving %s" % tile_path)
			print('.', end='', flush=True)
			img.save(img_io, 'PNG', compress_level=4)
		return img

	def dz_merge_tile(self, tl: Any, tr: Any, bl: Any, br: Any) -> Any:
		temp = np.empty((512, 512), dtype='float32')
		temp[0:256, 0:256] = tl
		temp[0:256, 256:512] = tr
		temp[256:512, 0:256] = bl
		temp[256:512, 256:512] = br

		# various strategies of aggregating values for
		# zoomed out tiles, each with their own trade-offs

		# Pick top-left of four pixels
		# fastest, large systematic bias,
		# does not preserve structure very well
		# return temp[0::2, 0::2]

		# Average of four
		# biased towards whatever bias the value distribution has
		# (typically towards zero)
		# Preserves structures better
		# temp2 = temp[0::2, 0::2]
		# temp2 += temp[1::2, 0::2]
		# temp2 += temp[0::2, 1::2]
		# temp2 += temp[1::2, 1::2]
		# temp2 *= 0.25
		# return temp2

		# Max value
		# Makes everything too bright,
		# completely destroys noise profile
		# tl = temp[0::2, 0::2]
		# tr = temp[1::2, 0::2]
		# bl = temp[0::2, 1::2]
		# br = temp[1::2, 1::2]
		# tl = np.fmax(tl, tr, out=tl)
		# bl = np.fmax(bl, br, out=bl)
		# np.fmax(tl, bl, out=tl)
		# return tl

		# Max value per column, average per row
		# an almost happy medium of the previous two,
		# still introduces too much brightness per zoom level
		# tl = temp[0::2, 0::2]
		# tr = temp[1::2, 0::2]
		# bl = temp[0::2, 1::2]
		# br = temp[1::2, 1::2]
		# tl = np.fmax(tl, tr, out=tl)
		# bl = np.fmax(bl, br, out=bl)
		# tl += bl
		# tl *= 0.5
		# return tl

		# Max-biased value per column, average per row
		# Looks like a good trade-off, introduces
		# a little brightness, but not much
		# could be tweaked with different weights
		tl = temp[0::2, 0::2]
		tr = temp[1::2, 0::2]
		bl = temp[0::2, 1::2]
		br = temp[1::2, 1::2]
		# this is a weighed average, with the higher value 3:1
		tmax = np.fmax(tl, tr)
		tmax += tmax
		tmax += tl
		tmax += tr
		bmax = np.fmax(bl, br)
		bmax += bmax
		bmax += bl
		bmax += br
		tmax += bmax
		tmax *= 0.125
		return tmax

	# Returns a submatrix scaled to 0-255 range
	def dz_get_zoom_tile(self, x: int, y: int, z: int, truncate: bool = False) -> Any:
		"""
		Create a 256x256 pixel matrix corresponding to the tile at x,y and z.

		Args:
			x (int):	Horizontal tile index (0 is left-most)

			y (int): 	Vertical tile index (0 is top-most)

			z (int): 	Zoom level (8 is 'middle' where pixels correspond to data values)

		Returns:
			Numpy ndarray of shape (256,256)
		"""
		# logging.debug("Computing tile at x=%i y=%i z=%i" % (x,y,z))
		(zmin, zmid, zmax) = self.dz_zoom_range()
		if z < zmin:
			raise ValueError("z cannot be less than %s" % zmin)
		if z > zmax:
			raise ValueError("z cannot be greater than %s" % zmax)
		if x < 0:
			raise ValueError("x cannot be less than zero")
		if y < 0:
			raise ValueError("y cannot be less than zero")

		if x * 256 * 2**(zmid - z) > self.ds.shape[1] or y * 256 * 2**(zmid - z) > self.ds.shape[0]:
			return np.zeros((256, 256), dtype='float32')

		if z == zmid:
			tile = self.ds._file['matrix'][y * 256:y * 256 + 256, x * 256:x * 256 + 256]
			# Pad if needed to make it 256x256
			if tile.shape[0] < 256 or tile.shape[1] < 256:
				tile = np.pad(tile, ((0, 256 - tile.shape[0]), (0, 256 - tile.shape[1])), 'constant', constant_values=0)
			# Rescale
			maxes = self.maxes()[y * 256:y * 256 + 256]
			mins = self.mins()[y * 256:y * 256 + 256]
			if maxes.shape[0] < 256:
				maxes = np.pad(maxes, (0, 256 - maxes.shape[0]), 'constant', constant_values=0)
				mins = np.pad(mins, (0, 256 - mins.shape[0]), 'constant', constant_values=0)

			# Human readable version of code below:
			# We add one because we want a log2 curve,
			# but keep zero values equal to zero, and
			# log2(0 + 1) = 0.
			#
			# p = np.log2(1 + tile.transpose() - mins)
			# q = np.log2(1 + maxes - mins)*255
			# tile = (p/q).transpose()

			mins = mins - 1
			maxes = maxes - mins
			# avoid allocating new arrays as much as we can
			np.log2(maxes, maxes)
			# replace zero with smallest non-zero positive number
			# to avoid complaints about dividing by zero later
			maxes[maxes == 0] = np.nextafter(0, 1)

			tile = tile.transpose()
			# we can't use -= mins here, because tile and mins might be a different dtype
			tile = tile - mins
			np.log2(tile, tile)
			tile *= 255
			tile /= maxes
			tile = tile.transpose()

			self.dz_save_tile(x, y, z, tile, truncate)
			return tile

		if z < zmid:
			# Get the four less zoomed-out tiles required to make this tile
			tl = self.dz_get_zoom_tile(x * 2, y * 2, z + 1, truncate)
			tr = self.dz_get_zoom_tile(x * 2 + 1, y * 2, z + 1, truncate)
			bl = self.dz_get_zoom_tile(x * 2, y * 2 + 1, z + 1, truncate)
			br = self.dz_get_zoom_tile(x * 2 + 1, y * 2 + 1, z + 1, truncate)
			# merge into zoomed out tiles
			tile = self.dz_merge_tile(tl, tr, bl, br)
			self.dz_save_tile(x, y, z, tile, truncate)
			return tile


_viridis = np.array([
	[68, 1, 84],
	[68, 2, 86],
	[69, 4, 87],
	[69, 5, 89],
	[70, 7, 90],
	[70, 8, 92],
	[70, 10, 93],
	[70, 11, 94],
	[71, 13, 96],
	[71, 14, 97],
	[71, 16, 99],
	[71, 17, 100],
	[71, 19, 101],
	[72, 20, 103],
	[72, 22, 104],
	[72, 23, 105],
	[72, 24, 106],
	[72, 26, 108],
	[72, 27, 109],
	[72, 28, 110],
	[72, 29, 111],
	[72, 31, 112],
	[72, 32, 113],
	[72, 33, 115],
	[72, 35, 116],
	[72, 36, 117],
	[72, 37, 118],
	[72, 38, 119],
	[72, 40, 120],
	[72, 41, 121],
	[71, 42, 122],
	[71, 44, 122],
	[71, 45, 123],
	[71, 46, 124],
	[71, 47, 125],
	[70, 48, 126],
	[70, 50, 126],
	[70, 51, 127],
	[70, 52, 128],
	[69, 53, 129],
	[69, 55, 129],
	[69, 56, 130],
	[68, 57, 131],
	[68, 58, 131],
	[68, 59, 132],
	[67, 61, 132],
	[67, 62, 133],
	[66, 63, 133],
	[66, 64, 134],
	[66, 65, 134],
	[65, 66, 135],
	[65, 68, 135],
	[64, 69, 136],
	[64, 70, 136],
	[63, 71, 136],
	[63, 72, 137],
	[62, 73, 137],
	[62, 74, 137],
	[62, 76, 138],
	[61, 77, 138],
	[61, 78, 138],
	[60, 79, 138],
	[60, 80, 139],
	[59, 81, 139],
	[59, 82, 139],
	[58, 83, 139],
	[58, 84, 140],
	[57, 85, 140],
	[57, 86, 140],
	[56, 88, 140],
	[56, 89, 140],
	[55, 90, 140],
	[55, 91, 141],
	[54, 92, 141],
	[54, 93, 141],
	[53, 94, 141],
	[53, 95, 141],
	[52, 96, 141],
	[52, 97, 141],
	[51, 98, 141],
	[51, 99, 141],
	[50, 100, 142],
	[50, 101, 142],
	[49, 102, 142],
	[49, 103, 142],
	[49, 104, 142],
	[48, 105, 142],
	[48, 106, 142],
	[47, 107, 142],
	[47, 108, 142],
	[46, 109, 142],
	[46, 110, 142],
	[46, 111, 142],
	[45, 112, 142],
	[45, 113, 142],
	[44, 113, 142],
	[44, 114, 142],
	[44, 115, 142],
	[43, 116, 142],
	[43, 117, 142],
	[42, 118, 142],
	[42, 119, 142],
	[42, 120, 142],
	[41, 121, 142],
	[41, 122, 142],
	[41, 123, 142],
	[40, 124, 142],
	[40, 125, 142],
	[39, 126, 142],
	[39, 127, 142],
	[39, 128, 142],
	[38, 129, 142],
	[38, 130, 142],
	[38, 130, 142],
	[37, 131, 142],
	[37, 132, 142],
	[37, 133, 142],
	[36, 134, 142],
	[36, 135, 142],
	[35, 136, 142],
	[35, 137, 142],
	[35, 138, 141],
	[34, 139, 141],
	[34, 140, 141],
	[34, 141, 141],
	[33, 142, 141],
	[33, 143, 141],
	[33, 144, 141],
	[33, 145, 140],
	[32, 146, 140],
	[32, 146, 140],
	[32, 147, 140],
	[31, 148, 140],
	[31, 149, 139],
	[31, 150, 139],
	[31, 151, 139],
	[31, 152, 139],
	[31, 153, 138],
	[31, 154, 138],
	[30, 155, 138],
	[30, 156, 137],
	[30, 157, 137],
	[31, 158, 137],
	[31, 159, 136],
	[31, 160, 136],
	[31, 161, 136],
	[31, 161, 135],
	[31, 162, 135],
	[32, 163, 134],
	[32, 164, 134],
	[33, 165, 133],
	[33, 166, 133],
	[34, 167, 133],
	[34, 168, 132],
	[35, 169, 131],
	[36, 170, 131],
	[37, 171, 130],
	[37, 172, 130],
	[38, 173, 129],
	[39, 173, 129],
	[40, 174, 128],
	[41, 175, 127],
	[42, 176, 127],
	[44, 177, 126],
	[45, 178, 125],
	[46, 179, 124],
	[47, 180, 124],
	[49, 181, 123],
	[50, 182, 122],
	[52, 182, 121],
	[53, 183, 121],
	[55, 184, 120],
	[56, 185, 119],
	[58, 186, 118],
	[59, 187, 117],
	[61, 188, 116],
	[63, 188, 115],
	[64, 189, 114],
	[66, 190, 113],
	[68, 191, 112],
	[70, 192, 111],
	[72, 193, 110],
	[74, 193, 109],
	[76, 194, 108],
	[78, 195, 107],
	[80, 196, 106],
	[82, 197, 105],
	[84, 197, 104],
	[86, 198, 103],
	[88, 199, 101],
	[90, 200, 100],
	[92, 200, 99],
	[94, 201, 98],
	[96, 202, 96],
	[99, 203, 95],
	[101, 203, 94],
	[103, 204, 92],
	[105, 205, 91],
	[108, 205, 90],
	[110, 206, 88],
	[112, 207, 87],
	[115, 208, 86],
	[117, 208, 84],
	[119, 209, 83],
	[122, 209, 81],
	[124, 210, 80],
	[127, 211, 78],
	[129, 211, 77],
	[132, 212, 75],
	[134, 213, 73],
	[137, 213, 72],
	[139, 214, 70],
	[142, 214, 69],
	[144, 215, 67],
	[147, 215, 65],
	[149, 216, 64],
	[152, 216, 62],
	[155, 217, 60],
	[157, 217, 59],
	[160, 218, 57],
	[162, 218, 55],
	[165, 219, 54],
	[168, 219, 52],
	[170, 220, 50],
	[173, 220, 48],
	[176, 221, 47],
	[178, 221, 45],
	[181, 222, 43],
	[184, 222, 41],
	[186, 222, 40],
	[189, 223, 38],
	[192, 223, 37],
	[194, 223, 35],
	[197, 224, 33],
	[200, 224, 32],
	[202, 225, 31],
	[205, 225, 29],
	[208, 225, 28],
	[210, 226, 27],
	[213, 226, 26],
	[216, 226, 25],
	[218, 227, 25],
	[221, 227, 24],
	[223, 227, 24],
	[226, 228, 24],
	[229, 228, 25],
	[231, 228, 25],
	[234, 229, 26],
	[236, 229, 27],
	[239, 229, 28],
	[241, 229, 29],
	[244, 230, 30],
	[246, 230, 32],
	[248, 230, 33],
	[251, 231, 35],
	[221, 221, 221]
])
