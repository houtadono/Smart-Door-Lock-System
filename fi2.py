import numpy as np

a = np.load("id_label.npy")
b = np.load("labels.npy")
c = np.load("features.npy", allow_pickle=True)
print(a,b)