import pandas as pd
import shap
import joblib


model_paths = {
    "gradient_boosting": "C://tu_project//data_science//datamanagement//static//files//model_xgb.joblib"
}
models = {}
test_data = pd.DataFrame([{"GCS_max": 3.5, "GCS_mean": 3.5,
                                   "Lactate_min": 10.6,
                                   "Lactate_max": 15.85,
                                   "Lactate_mean": 12.31,
                                   "BUN_min": 98,
                                   "BUN_mean": 107.61,
                                   "AG_max": 26.5,
                                   "AG_mean": 20.93,
                                   "Bilirubin_max": 39.5,
                                   "Bilirubin_mean": 34.33,
                                   "AG_MEAN": 18.75,
                                   "AG_MAX": 22,
                                   "AG_MEDIAN": 19.5,
                                   "AG_MIN": 15,
                                   "AG_STD": 8.5,
                                   "SYSBP_MIN": 76.975,
                                   "SYSBP_MEAN":78.16 ,
                                   "SYSBP_STD": 24.17,
                                   "DIASBP_MIN": 41.8,
                                   "DIASBP_MEAN": 47.71,
                                   "AGE": 54,
                                   "RR_MEAN": 17.24, "RR_STD": 6.88,
                                   "RR_MAX": 23.5, "TEMP_STD": 1.5,
                                   "TEMP_MIN": 25.2, "HR_MEAN": 58.76,
                                   "HR_MAX":96 ,
                                   "age_adj_comorbidity_score": 29
                                   }])

# Convert EVERY cell to numeric
df = test_data.apply(pd.to_numeric, errors="coerce")

# -----------------------------
# 2. Load models
# -----------------------------
print(model_paths)
for name, path in model_paths.items():
    with open(path, "rb") as f:
        models[name] = joblib.load(path)

# Predict
xb_pred = models["gradient_boosting"].predict_proba(df)[0][1]
print("gradient_boosting:", xb_pred)

# -----------------------------
# 4. SHAP Explainability
# -----------------------------
shap_results = {}
for model_name, model in models.items():
    # Create SHAP explainer
    explainer = shap.TreeExplainer(model)

    # Compute SHAP values
    shap_values = explainer.shap_values(df)
    print("shap_values: ", shap_values)
    # For classifiers → take class 1
    if isinstance(shap_values, list):
        shap_values = shap_values[1]

    shap.summary_plot(
        shap_values,
        df,
        feature_names=df.columns
    )
    # For classifiers, shap_values is a list
    """
    if isinstance(shap_values, list):
        shap_values = shap_values[1]

        #Store results for the first row only
        shap_results[model_name] = {
            "feature_names": df.columns.tolist(),
            "shap_values": shap_values[0].tolist()
        }
        print("shap_results: ", shap_results)

    """
    shap_results[model_name] = {
        "feature_names": df.columns.tolist(),
        "shap_values": shap_values[0].tolist()
    }
    print(shap_results[model_name])
    # -----------------------------
    # 5. Build JSON response
    # -----------------------------
    response = {
        "prediction": {
            "Gradient_Boosting": float(xb_pred)
        },
        "explainability": shap_results
    }
    print(response)
