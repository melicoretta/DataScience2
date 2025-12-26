import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import xgboost as xgb
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_validate
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.tree import DecisionTreeRegressor, DecisionTreeClassifier
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.metrics import roc_auc_score, average_precision_score, classification_report, confusion_matrix, roc_curve, auc
from django.contrib.staticfiles.storage import staticfiles_storage
import joblib

# =========================
# CONFIG
# =========================


# Read csv files
file_path = 'C://tu_project//data_science//datamanagement//static//files//first_feature_df_17_12_2025.csv'
df = pd.read_csv(file_path)
df.head(10)

# Find dataset size and column data types
print(df.shape)
pd.DataFrame({"column": df.columns, "dtype": df.dtypes.values})


# Checking missing values
df.isnull().sum()



# Checking missing value of Target varaible
df['MORTALITY_INHOSPITAL'].isnull().sum()

# Print the all columns names
print(df.columns.tolist())

# Univariate Analysis
df.hist(bins=20, figsize=(15, 10), grid=False)
plt.suptitle("Distribution of Numerical Features", fontsize=18)
plt.tight_layout()
plt.show()




# Calculate correlation matrix
corr_matrix = df.corr()
print(corr_matrix)



# Split data
X = df.drop(['MORTALITY_INHOSPITAL','SUBJECT_ID','HADM_ID','ICUSTAY_ID'], axis=1)
y = df['MORTALITY_INHOSPITAL']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

print(f"Train size: {len(X_train)}")
print(f"Test size: {len(X_test)}")


# Filled the missing values with x_train median to avoid data leakage
medians = X_train.median()
X_train = X_train.fillna(medians)
X_test = X_test.fillna(medians)

# Split data
X = df.drop(['MORTALITY_INHOSPITAL','SUBJECT_ID','HADM_ID','ICUSTAY_ID'], axis=1)
y = df['MORTALITY_INHOSPITAL']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

print(f"Train size: {len(X_train)}")
print(f"Test size: {len(X_test)}")


# Filled the missing values with x_train median to avoid data leakage
medians = X_train.median()
X_train = X_train.fillna(medians)
X_test  = X_test.fillna(medians)

# Train the different model

model_lr= LogisticRegression(class_weight="balanced", max_iter=2000)
model_lr.fit(X_train, y_train)

model_dtc=DecisionTreeClassifier(max_depth=4, min_samples_leaf=50, class_weight="balanced", random_state=42)
model_dtc.fit(X_train, y_train)

model_rfc= RandomForestClassifier(n_estimators=400,random_state=42,n_jobs=-1,class_weight="balanced_subsample")
model_rfc.fit(X_train, y_train)




# XGBoost model

scale_pos_weight = (y_train == 0).sum() / (y_train == 1).sum()

model_xgb=xgb.XGBClassifier(
        n_estimators=600,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_lambda=1.0,
        scale_pos_weight=scale_pos_weight,
        eval_metric="auc",
        random_state=42,
        n_jobs=-1)

model_xgb.fit(X_train, y_train)


joblib.dump(model_xgb, 'C:\\tu_project\\data_science\\datamanagement\\static\\files\\model_xgb.joblib')
joblib.dump(model_rfc, 'C:\\tu_project\\data_science\\datamanagement\\static\\files\\model_rfc.joblib')
joblib.dump(model_dtc, 'C:\\tu_project\\data_science\\datamanagement\\static\\files\\model_dtc.joblib')
joblib.dump(model_lr, 'C:\\tu_project\\data_science\\datamanagement\\static\\files\\model_lr.joblib')

