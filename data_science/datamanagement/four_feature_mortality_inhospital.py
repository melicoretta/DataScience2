#!/usr/bin/env python
# coding: utf-8

# In[1]:


import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import xgboost as xgb
import pickle
import joblib
import shap
from sklearn.pipeline import Pipeline
from sklearn.base import clone
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_validate
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.tree import DecisionTreeRegressor, DecisionTreeClassifier
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.metrics import roc_auc_score, average_precision_score, classification_report, confusion_matrix, roc_curve, auc


# In[2]:


# Read csv files
df= pd.read_csv("C:\\tu_project\\DataScience2\\data_science\\datamanagement\\static\\files\\fifth_feature_df_14_01_2026.csv")
df.head(10)


# In[3]:


# Find dataset size and column data types
print(df.shape)
pd.DataFrame({"column": df.columns, "dtype": df.dtypes.values})



# In[4]:


# Checking missing values
df.isnull().sum()


# In[5]:


# Checking missing value and value counts of Target varaible
print(df['MORTALITY_INHOSPITAL'].isnull().sum())
df['MORTALITY_INHOSPITAL'].value_counts()


# In[7]:


# Print the all columns names
print(df.columns.tolist())


# In[8]:


# Univariate Analysis 
df.hist(bins=20, figsize=(15, 10), grid=False)
plt.suptitle("Distribution of Numerical Features", fontsize=18)
plt.tight_layout()
plt.show()


# In[9]:


# Calculate correlation matrix
corr_matrix = df.corr()
print(corr_matrix)


# In[10]:


# Split data
X = df.drop(['MORTALITY_INHOSPITAL', 'MORTALITY_90DAY', 'MORTALITY_180DAY', 'SUBJECT_ID','HADM_ID','ICUSTAY_ID'], axis=1)
y = df['MORTALITY_INHOSPITAL']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

print(f"Train size: {len(X_train)}")
print(f"Test size: {len(X_test)}")


# Filled the missing values with x_train median to avoid data leakage
medians = X_train.median()
X_train = X_train.fillna(medians)
X_test  = X_test.fillna(medians)




# In[11]:


# Train the different model

model_lr= LogisticRegression(class_weight="balanced", max_iter=2000)
model_lr.fit(X_train, y_train)

model_dtc=DecisionTreeClassifier(max_depth=4, min_samples_leaf=50, class_weight="balanced", random_state=42)
model_dtc.fit(X_train, y_train)

model_rfc= RandomForestClassifier(n_estimators=400,random_state=42,n_jobs=-1,class_weight="balanced_subsample")
model_rfc.fit(X_train, y_train)


def calculation(model, X_test, y_test, threshold=0.5):
    y_prob = model.predict_proba(X_test)[:, 1]
    y_pred = (y_prob >= threshold).astype(int)

    auroc = roc_auc_score(y_test, y_prob)
    ap = average_precision_score(y_test, y_prob)
    cf_matrix = confusion_matrix(y_test, y_pred)
    cl_report = classification_report(y_test, y_pred, digits=4)
    return auroc, ap, cf_matrix, cl_report

# Calculate metrics for all models
print("Logistic Regression:")
auroc, ap, cf_matrix, cl_report = calculation(model_lr, X_test, y_test)
print(f"Area Under the Receiver Operating Characteristic curve:{auroc}, Average Precision:{ap}")
print('Confusion Matrix:')
print(cf_matrix)
print('Classification Report:')
print(cl_report)

print("DecisionTreeClassifier:")
auroc, ap, cf_matrix, cl_report = calculation(model_dtc, X_test, y_test)
print(f"Area Under the Receiver Operating Characteristic curve:{auroc}, Average Precision:{ap}")
print('Confusion Matrix:')
print(cf_matrix)
print('Classification Report:')
print(cl_report)

print("Random Forest:")
auroc, ap, cf_matrix, cl_report = calculation(model_rfc, X_test, y_test)
print(f"Area Under the Receiver Operating Characteristic curve:{auroc}, Average Precision:{ap}")
print('Confusion Matrix:')
print(cf_matrix)
print('Classification Report:')
print(cl_report)




# In[12]:


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
        eval_metric=["auc", "aucpr"],
        random_state=42,
        n_jobs=-1)

model_xgb.fit(X_train, y_train)

print("XGBoost Classifier:")
auroc, ap, cf_matrix, cl_report = calculation(model_xgb, X_test, y_test)
print(f"Area Under the Receiver Operating Characteristic curve:{auroc}, Average Precision:{ap}")
print('Confusion Matrix:')
print(cf_matrix)
print('Classification Report:')
print(cl_report)



# In[13]:


# With KFold cross validation

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

scoring = {"auroc": "roc_auc", "ap": "average_precision"}

def run_cv(name, model):
    res = cross_validate(model, X_train, y_train, cv=cv, scoring=scoring, n_jobs=-1)

    auroc_mean = res['test_auroc'].mean()
    auroc_std  = res['test_auroc'].std()
    ap_mean    = res['test_ap'].mean()
    ap_std     = res['test_ap'].std()

    print(f"{name} (5-Fold CV)")
    print(f"AUROC: {auroc_mean:.4f} ± {auroc_std:.4f}")
    print(f"AP: {ap_mean:.4f} ± {ap_std:.4f}\n")

    return {"model": name,"auroc_mean": auroc_mean, "auroc_std": auroc_std,"ap_mean": ap_mean, "ap_std": ap_std}

# Logistic Regression 
lr_pipe = Pipeline([("imputer", SimpleImputer(strategy="median")), ("model", model_lr)])

# Decision Tree
dtc_pipe = Pipeline([("imputer", SimpleImputer(strategy="median")), ("model", model_dtc)])

# Random Forest
rfc_pipe = Pipeline([("imputer", SimpleImputer(strategy="median")), ("model", model_rfc)])

# XGBoost model
xgb_pipe = Pipeline([("imputer", SimpleImputer(strategy="median")), ("model", model_xgb)])

# Collecting results
results = []

results.append(run_cv("Logistic Regression", lr_pipe))
results.append(run_cv("Decision Tree", dtc_pipe))
results.append(run_cv("Random Forest", rfc_pipe))
results.append(run_cv("XGBoost", xgb_pipe))
print(results)


# In[14]:


# Create dataframe of result
results_df = pd.DataFrame(results)
results_df


# In[15]:


# Finding the best model
best_model = results_df.sort_values(by=["ap_mean", "auroc_mean"],ascending=False).iloc[0]

print("Selected model:", best_model["model"])

# pick the best pipeline object (not only name)
models = {
    "Logistic Regression": lr_pipe,
    "Decision Tree": dtc_pipe,
    "Random Forest": rfc_pipe,
    "XGBoost": xgb_pipe,
}

best_name = best_model["model"]
final_model = clone(models[best_name]) 
final_model.fit(X_train, y_train) 





# In[16]:


# Evaluate on held-out test set
auroc, ap, cf_matrix, cl_report = calculation(final_model, X_test, y_test)
print(f"Final model (test) AUROC: {auroc:.4f}, AP: {ap:.4f}")
print("Confusion Matrix:")
print(cf_matrix)
print("Classification Report:")
print(cl_report)


# In[17]:


#Feature importance of XGBoost
xgb_fitted = final_model.named_steps["model"]

importance = xgb_fitted.feature_importances_


fi_xgb = pd.DataFrame({
    "feature": X_train.columns,
    "importance": importance
}).sort_values(by="importance", ascending=False)

print(fi_xgb)

# Plot top 20
plt.figure(figsize=(10, 6))
plt.barh(fi_xgb["feature"].head(20)[::-1],
         fi_xgb["importance"].head(20)[::-1])
plt.xlabel("Importance")
plt.title("XGBoost Feature Importance")
plt.tight_layout()
plt.show()


# In[18]:


# SHAP summary plot showing global feature importance for the final XGBoost model

explainer = shap.TreeExplainer(xgb_fitted)
shap_values = explainer.shap_values(X_train)

shap.summary_plot(shap_values, X_train, plot_type="bar")


# In[20]:


#joblib file of final model

joblib.dump(final_model, "C:\\tu_project\\DataScience2\\data_science\\datamanagement\\static\\model\\XGBoost.joblib")


#pkl file of final model
# with open('XGBoost_third_feature.pkl', 'wb') as File:
#     pickle.dump(final_model, File)

