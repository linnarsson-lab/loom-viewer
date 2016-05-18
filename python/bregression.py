from flask import Flask, request, Response
import json
import pystan
import numpy as np
import grequests

model = """
# Variational inference version running on a whole matrix

data {
	int <lower=0> G;					# number of genes
	int	<lower=0> C;					# number of cells
	int <lower=0> K;					# number of predictors
	int <lower=0> y[C, G];				# observed molecule counts
	matrix <lower=0> [C, K] x;			# predictor matrix 
}

parameters {
	matrix <lower=0> [K, G] beta;		# coefficients for each gene
	real <lower=0> r;					# overdispersion
}

model {
	matrix [C, G] mu;

	# priors
	r ~ cauchy(0, 1);
	beta ~ pareto(0.01, 1.5);

	# regression
	mu <- x * beta;
	y ~ neg_binomial(mu / r, 1 / r);
}
"""

def fit(x, y, chains=2, iterations=1000):
	"""
	Run a Bayesian generalized linear regression model on the given design matrix (x) and observed data (y).

	Args:
		x (numpy C-by-K matrix):			The design matrix for C cells and K predictors
		y (numpy C-by-G matrix):			The observed values for C cells and G genes

	Returns:
		beta (numpy G-by-K-by-S matrix):	Posterior variational inference samples for each coefficient beta. S = iterations * chains / 2.			
	"""
	reqs = []
	for ix in xrange(y.shape[1]):
		reqs.append(grequests.post('http://localhost:5000', json={'x': x.tolist(),"N": x.shape[0], "K": x.shape[1], "y": y[ix,:].T.tolist()}, stream=True))
	responses = grequests.map(reqs)

	results = []
	for ix in xrange(len(responses)):
		if responses[ix] != None:
			results.append(np.frombuffer(responses[ix].raw.data))
		else:
			result.append(np.zeros((y.shape[0], iterations*chains/2, x.shape[1]) + 2))
	return np.concatenate(result, axis=0)

class StanServer(Flask):
	# Disable cacheing 
	def get_send_file_max_age(self, name):
		return 0

app = StanServer(__name__)

@app.route('/', methods=['POST'])
def regression():					# Run the regression model on a single gene
	data = request.get_json()
	fit = pystan.stan(model_code=model, data=data, iter=1000, chains=2)
	return Response(fit.extract(permuted=False).tobytes(), mimetype="application/octet-stream")

if __name__ == '__main__':
	app.run(debug=False, host="0.0.0.0", port=80)






