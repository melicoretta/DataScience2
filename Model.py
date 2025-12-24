import numpy as np
import pandas as pd
import joblib
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    roc_auc_score, accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report, roc_curve, auc
)

# =========================
# CONFIG
# =========================
CSV_PATH = "final_data_table.csv"
TARGET = "MORTALITY_INHOSPITAL"   
TEXT_COL = "DIAGNOSIS"

TEST_SIZE = 0.20
RANDOM_STATE = 42


# =========================
# LOAD DATA
# =========================
df = pd.read_csv(CSV_PATH)

# drop rows where target missing
df = df.dropna(subset=[TARGET]).copy()
df[TARGET] = df[TARGET].astype(int)

# ensure text col exists and is string
if TEXT_COL in df.columns:
    df[TEXT_COL] = df[TEXT_COL].fillna("unknown").astype(str)

# remove common ID columns if they exist
id_cols = ["SUBJECT_ID", "HADM_ID", "ICUSTAY_ID"]
id_cols = [c for c in id_cols if c in df.columns]

X = df.drop(columns=[TARGET])
y = df[TARGET]

X = X.drop(columns=id_cols, errors="ignore")

# =========================
# FEATURE TYPES
# =========================
numeric_cols = X.select_dtypes(include=["number"]).columns.tolist()
text_cols = [TEXT_COL] if TEXT_COL in X.columns else []
categorical_cols = [c for c in X.columns if c not in numeric_cols + text_cols]

print("Samples:", X.shape[0])
print("Numeric:", len(numeric_cols))
print("Categorical:", len(categorical_cols))
print("Text:", TEXT_COL if TEXT_COL in X.columns else "MISSING")

# =========================
# PREPROCESSING
# =========================
numeric_pipeline = Pipeline([
    ("imputer", SimpleImputer(strategy="median")),
    ("scaler", StandardScaler())
])

categorical_pipeline = Pipeline([
    ("imputer", SimpleImputer(strategy="most_frequent")),
    ("onehot", OneHotEncoder(handle_unknown="ignore"))
])

text_pipeline = Pipeline([
    ("tfidf", TfidfVectorizer(
        ngram_range=(1, 4),
        min_df=2,
        max_features=55000,
        stop_words="english"
    ))
])

preprocess = ColumnTransformer(
    transformers=[
        ("num", numeric_pipeline, numeric_cols),
        ("cat", categorical_pipeline, categorical_cols),
        ("text", text_pipeline, TEXT_COL)
    ]
)

# =========================
# MODEL (Logistic Regression)
# =========================
model = Pipeline([
    ("preprocess", preprocess),
    ("classifier", LogisticRegression(
        max_iter=4000,
        class_weight="balanced",
        random_state=RANDOM_STATE
    ))
])

# =========================
# SPLIT / TRAIN
# =========================
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=TEST_SIZE,
    stratify=y,
    random_state=RANDOM_STATE
)

model.fit(X_train, y_train)

# =========================
# EVALUATION
# =========================
y_pred = model.predict(X_test)
y_proba = model.predict_proba(X_test)[:, 1]

print("\n=== Logistic Regression (Test Set) ===")
print("AUROC    :", round(roc_auc_score(y_test, y_proba), 4))
print("Accuracy :", round(accuracy_score(y_test, y_pred), 4))
print("Precision:", round(precision_score(y_test, y_pred, zero_division=0), 4))
print("Recall   :", round(recall_score(y_test, y_pred, zero_division=0), 4))
print("F1       :", round(f1_score(y_test, y_pred, zero_division=0), 4))

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))

print("\nClassification Report:")
print(classification_report(y_test, y_pred, zero_division=0))

# ROC curve
fpr, tpr, _ = roc_curve(y_test, y_proba)
roc_auc = auc(fpr, tpr)

plt.figure(figsize=(7, 6))
plt.plot(fpr, tpr, label=f"Logistic Regression (AUC = {roc_auc:.3f})", linewidth=2)
plt.plot([0, 1], [0, 1], linestyle="--", linewidth=1)
plt.xlabel("False Positive Rate")
plt.ylabel("True Positive Rate")
plt.title("ROC Curve – Mortality Prediction")
plt.legend(loc="lower right")
plt.grid(alpha=0.3)
plt.tight_layout()
plt.show()

# =========================
# SAVE MODEL
# =========================
joblib.dump(model, "mortality_logistic.joblib")
print("\nSaved model: mortality_logistic.joblib")
