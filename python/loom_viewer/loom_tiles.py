import os
import h5py
import numpy as np
import scipy
import logging

from loompy import LoomConnection


class LoomTiles(object):
	#############
	# DEEP ZOOM #
	#############
	def __init__(self, ds: LoomConnection) -> None:
		self.ds = ds
		self._maxes = None  # type: np.ndarray
		self._mins = None

	def maxes(self):
		if self._maxes is None:
			self._maxes = self.ds.map([max], 0)[0]
		return self._maxes

	def mins(self):
		if self._mins is None:
			self._mins = self.ds.map([min], 0)[0]
		return self._mins

	def prepare_heatmap(self):
		if self.ds._file.__contains__("tiles"):
			logging.info("    Removing deprecated tile pyramid, use h5repack to reclaim space")
			del self.ds._file['tiles']
		self.dz_get_zoom_tile(0, 0, 8)
		logging.info("    done")

	def dz_zoom_range(self):
		"""
		Determine the zoom limits for this file.

		Returns:
			Tuple (middle, min_zoom, max_zoom) of integer zoom levels.
		"""
		return (8, int(max(np.ceil(np.log2(self.ds.shape)))), int(max(np.ceil(np.log2(self.ds.shape))) + 8))

	def dz_dimensions(self):
		"""
		Determine the total size of the deep zoom image.

		Returns:
			Tuple (x,y) of integers
		"""
		(y, x) = np.divide(self.ds.shape, 256) * 256 * pow(2, 8)
		return (x, y)

	def dz_tile_to_image(self, x, y, z, tile):
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
			tile[max_y+1:256, :] = 255
		return scipy.misc.toimage(tile, cmin=0, cmax=255, pal=_bluewhitered)

	def dz_save_tile(self, x, y, z, tile, truncate=False):
		(zmin, zmid, zmax) = self.dz_zoom_range()
		if (z < zmin or z > zmid or
			x < 0 or y < 0 or
			x * 256 * 2**(zmid-z) > self.ds.shape[1] or
			y * 256 * 2**(zmid-z) > self.ds.shape[0]):
			#logging.info("Trying to save out of bound tile: x: %02d y: %02d z: %02d" % (x, y, z))
			return

		tiledir = '%s.tiles/z%02d/' % (self.ds.filename, z)
		tilepath = 	'%sx%03d_y%03d.png' % (tiledir, x, y)

		# make sure the tile directory exists
		# we use a try/error approach so that we
		# don't have to worry about race conditions
		# (if another process creates the same
		#  directory we just catch the exception)
		try:
			os.makedirs(tiledir, exist_ok=True)
		except OSError as exception:
			# if the error was that the directory already
			# exists, ignore it, since that is expected.
			if exception.errno != errno.EEXIST:
				raise

		if os.path.isfile(tilepath) and not truncate:
			return scipy.misc.imread(tilepath, mode='P')
		else:
			img = self.dz_tile_to_image(x, y, z, tile)
			# save to file, overwriting the old one
			with open(tilepath, 'wb') as img_io:
				#logging.info("saving %s" % tilepath)
				print('.', end='', flush=True)
				img.save(img_io, 'PNG', compress_level=4)
			return img



	def dz_merge_tile(self, tl, tr, bl, br):
		temp = np.empty((512, 512), dtype = 'float32')
		temp[0:256, 0:256] = tl
		temp[0:256, 256:512] = tr
		temp[256:512, 0:256] = bl
		temp[256:512, 256:512] = br
		return temp[0::2, 0::2]

	# Returns a submatrix scaled to 0-255 range
	def dz_get_zoom_tile(self, x, y, z):
		"""
		Create a 256x256 pixel matrix corresponding to the tile at x,y and z.

		Args:
			x (int):	Horizontal tile index (0 is left-most)

			y (int): 	Vertical tile index (0 is top-most)

			z (int): 	Zoom level (8 is 'middle' where pixels correspond to data values)

		Returns:
			Numpy ndarray of shape (256,256)
		"""
		#logging.debug("Computing tile at x=%i y=%i z=%i" % (x,y,z))
		(zmin, zmid, zmax) = self.dz_zoom_range()
		if z < zmin:
			raise ValueError("z cannot be less than %s" % zmin)
		if z > zmax:
			raise ValueError("z cannot be greater than %s" % zmax)
		if x < 0:
			raise ValueError("x cannot be less than zero")
		if y < 0:
			raise ValueError("y cannot be less than zero")

		if x * 256 * 2**(zmid-z) > self.ds.shape[1] or y * 256 * 2**(zmid-z) > self.ds.shape[0]:
			return np.zeros((256, 256), dtype='float32')

		if z == zmid:
			tile = self.ds._file['matrix'][y * 256 : y * 256 + 256, x * 256 : x*256 + 256]
			# Pad if needed to make it 256x256
			if tile.shape[0] < 256 or tile.shape[1] < 256:
				tile = np.pad(tile, ((0,256-tile.shape[0]), (0,256-tile.shape[1])), 'constant', constant_values=0)
			# Rescale
			maxes = self.maxes()[y*256:y*256+256]
			mins = self.mins()[y*256:y*256+256]
			if maxes.shape[0] < 256:
				maxes = np.pad(maxes, (0, 256 - maxes.shape[0]), 'constant', constant_values=0)
				mins = np.pad(mins, (0, 256 - mins.shape[0]), 'constant', constant_values=0)
			# tile = (np.log2(tile.transpose()-mins+1)/np.log2(maxes-mins+1)*255).transpose()
			# avoid intermediate arrays as much as we can
			mins = mins- 1
			maxes = maxes - mins
			np.log2(maxes, maxes)
			np.log2(tile.transpose()-mins, tile)
			tile /= maxes
			tile *= 255
			tile = tile.transpose()
			#tile = (tile+1)/(maxes+1)*256
			self.dz_save_tile(x, y, z, tile, truncate=False)
			return tile

		if z < zmid:
			# Get the four less zoomed-out tiles required to make this tile
			tl = self.dz_get_zoom_tile(x*2,y*2,z+1)
			tr = self.dz_get_zoom_tile(x*2 + 1,y*2,z+1)
			bl = self.dz_get_zoom_tile(x*2,y*2 + 1,z+1)
			br = self.dz_get_zoom_tile(x*2+1,y*2+1,z+1)
			# merge into zoomed out tiles
			tile = self.dz_merge_tile(tl, tr, bl, br)
			self.dz_save_tile(x, y, z, tile, truncate=False)
			return tile


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
		[130,	9,  36],
		[128,	8,  35],
		[125,	7,  35],
		[122,	6,  34],
		[119,	5,  34],
		[116,	4,  34],
		[113,	3,  33],
		[110,	2,  33],
		[107,	1,  32],
		[221, 221, 221]])
